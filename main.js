const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const WebSocket = require('ws')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.ws = null
		this.isConnected = false
		this.functionsList = []
		this.widgetsList = []
		this.widgetTypes = {} // Store widget types (button, slider, etc)
		this.reconnectTimer = null
		this.pollingInterval = null
		
		// Store statuses and values for feedbacks
		this.functionStatuses = {}
		this.widgetStatuses = {}
		this.channelValues = {}
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		
		// Set initial variables
		this.setVariableValues({
			connection_status: 'Connecting',
			connection_ip: this.config.host || '',
			connection_port: this.config.port || '',
			functions_count: '0',
			widgets_count: '0'
		})
		
		this.initConnection()
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}

	initConnection() {
		if (this.ws) {
			this.ws.close(1000)
			this.ws = null
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		if (!this.config.host || !this.config.port) {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host or port configuration')
			return
		}

		this.connectToQLC()
		
		// Start polling for data
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval)
		}
		
		// Convert seconds to milliseconds for the interval
		const pollIntervalMs = (this.config.pollInterval || 10) * 1000;
		this.pollingInterval = setInterval(() => {
			if (this.isConnected) {
				// Get lists of functions and widgets
				this.sendCommand('getFunctionsList')
				this.sendCommand('getWidgetsList')
				
				// Poll status for all widgets and functions
				
				// Request status for all widgets
				if (this.widgetsList && this.widgetsList.length > 0) {
					this.widgetsList.forEach(widget => {
						this.sendCommand('getWidgetStatus', [widget.id])
					})
				}
				
				// Request status for all functions
				if (this.functionsList && this.functionsList.length > 0) {
					this.functionsList.forEach(func => {
						this.sendCommand('getFunctionStatus', [func.id])
					})
				}
			}
		}, pollIntervalMs) // Poll based on config
	}

	connectToQLC() {
		const url = `ws://${this.config.host}:${this.config.port}/qlcplusWS`
		this.log('debug', `Connecting to QLC+ at ${url}`)
		
		// Update connection variables
		this.setVariableValues({
			connection_status: 'Connecting',
			connection_ip: this.config.host || '',
			connection_port: this.config.port || ''
		})
		
		try {
			this.ws = new WebSocket(url)
			
			this.ws.on('open', () => {
				this.log('info', 'Connected to QLC+')
				this.updateStatus(InstanceStatus.Ok)
				this.isConnected = true
				
				// Update connection status variable
				this.setVariableValues({
					connection_status: 'Connected'
				})
				
				// Get initial data
				this.sendCommand('getFunctionsList')
				this.sendCommand('getWidgetsList')
			})
			
			this.ws.on('close', (code) => {
				this.isConnected = false
				this.log('debug', `Connection closed with code ${code}`)
				this.updateStatus(InstanceStatus.Disconnected, 'Connection closed')
				
				// Update connection status variable
				this.setVariableValues({
					connection_status: 'Disconnected'
				})
				
				// Try to reconnect after 5 seconds
				this.reconnectTimer = setTimeout(() => {
					this.connectToQLC()
				}, 5000)
			})
			
			this.ws.on('error', (error) => {
				this.log('error', `WebSocket error: ${error.message}`)
				this.updateStatus(InstanceStatus.ConnectionFailure, error.message)
				
				// Update connection status variable
				this.setVariableValues({
					connection_status: 'Error: ' + error.message
				})
			})
			
			this.ws.on('message', (data) => {
				this.processMessage(data.toString())
			})
		} catch (error) {
			this.log('error', `Connection error: ${error.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, error.message)
			
			// Update connection status variable
			this.setVariableValues({
				connection_status: 'Error: ' + error.message
			})
			
			// Try to reconnect after 5 seconds
			this.reconnectTimer = setTimeout(() => {
				this.connectToQLC()
			}, 5000)
		}
	}

	processMessage(message) {
		const msgParams = message.split('|')
		
		// Handle automatic function status updates
		if (msgParams[0] === 'FUNCTION' && msgParams.length >= 3) {
			const functionId = msgParams[1]
			const status = msgParams[2]
			
			// Log raw message for debugging
			this.log('debug', `Raw function status message: ${message}`)
			
			// Update our status cache
			this.functionStatuses[functionId] = status
			
			// Find function name
			const func = this.functionsList.find(f => f.id === functionId)
			const functionName = func ? func.name : 'Unknown'
			
			// Update variables
			this.setVariableValues({
				last_function_id: functionId,
				last_function_name: functionName,
				last_function_status: status
			})
			
			// Log the current state of functionStatuses
			this.log('debug', `Function ${functionId} status updated to: ${status}`)
			this.log('debug', `Current functionStatuses: ${JSON.stringify(this.functionStatuses)}`)
			
			// Check feedbacks that might be affected
			this.checkFeedbacks('functionStatus')
			
			return
		}
		
		if (msgParams[0] === 'QLC+API') {
			switch (msgParams[1]) {
				case 'getFunctionsList':
					this.functionsList = []
					for (let i = 2; i < msgParams.length; i += 2) {
						if (msgParams[i] && msgParams[i+1]) {
							this.functionsList.push({
								id: msgParams[i],
								name: msgParams[i+1]
							})
						}
					}
					// Update variables
					this.setVariableValues({
						functions_count: this.functionsList.length.toString()
					})
					
					// Refresh actions and feedbacks to update dropdowns
					this.updateActions()
					this.updateFeedbacks()
					this.checkFeedbacks('functionStatus')
					break
					
				case 'getWidgetsList':
					this.widgetsList = []
					for (let i = 2; i < msgParams.length; i += 2) {
						if (msgParams[i] && msgParams[i+1]) {
							this.widgetsList.push({
								id: msgParams[i],
								name: msgParams[i+1]
							})
							
							// Request widget type for each widget
							this.sendCommand('getWidgetType', [msgParams[i]])
						}
					}
					// Update variables
					this.setVariableValues({
						widgets_count: this.widgetsList.length.toString()
					})
					
					// Refresh actions and feedbacks to update dropdowns
					this.updateActions()
					this.updateFeedbacks()
					this.checkFeedbacks('widgetStatus')
					break
					
				case 'getFunctionStatus':
					// Format: QLC+API|getFunctionStatus|ID|STATUS
					if (msgParams.length >= 4) {
						const functionId = msgParams[2]
						const status = msgParams[3]
						
						// Store the status
						this.functionStatuses[functionId] = status
						
						// Find function name
						const func = this.functionsList.find(f => f.id === functionId)
						const functionName = func ? func.name : 'Unknown'
						
						// Update variables
						this.setVariableValues({
							last_function_id: functionId,
							last_function_name: functionName,
							last_function_status: status
						})
						
						// Debug log
						this.log('debug', `Function status updated: Function ${functionId} (${functionName}) is ${status}`)
						this.log('debug', `Current functionStatuses: ${JSON.stringify(this.functionStatuses)}`)
					}
					this.checkFeedbacks('functionStatus')
					break
					
				case 'getWidgetStatus':
					// Format: QLC+API|getWidgetStatus|ID|STATUS
					if (msgParams.length >= 4) {
						const widgetId = msgParams[2]
						const status = msgParams[3]
						this.widgetStatuses[widgetId] = status
						
						// Find widget name
						const widget = this.widgetsList.find(w => w.id === widgetId)
						const widgetName = widget ? widget.name : 'Unknown'
						
						// Update variables
						this.setVariableValues({
							last_widget_id: widgetId,
							last_widget_name: widgetName,
							last_widget_status: status
						})
					}
					this.checkFeedbacks('widgetStatus')
					break
					
				case 'getWidgetType':
					// Format: QLC+API|getWidgetType|ID|TYPE
					if (msgParams.length >= 4) {
						const widgetId = msgParams[2]
						const widgetType = msgParams[3]
						
						// Store widget type
						this.widgetTypes[widgetId] = widgetType
						
						// Update actions to reflect new widget type information
						this.updateActions()
					}
					break
					
				case 'getChannelsValues':
					// Format: QLC+API|getChannelsValues|UNIVERSE|ADDRESS|VALUES...
					if (msgParams.length >= 5) {
						const universe = msgParams[2]
						const startAddress = parseInt(msgParams[3])
						
						// Store each channel value
						for (let i = 0; i < msgParams.length - 4; i++) {
							const address = startAddress + i
							const value = parseInt(msgParams[4 + i])
							const channelKey = `${universe}_${address}`
							this.channelValues[channelKey] = value
							
							// Update variables for the first channel
							if (i === 0) {
								this.setVariableValues({
									last_dmx_universe: universe,
									last_dmx_address: address.toString(),
									last_dmx_value: value.toString()
								})
							}
						}
					}
					this.checkFeedbacks('channelValue')
					break
			}
		}
	}

	sendCommand(cmd, params = []) {
		if (!this.isConnected || !this.ws) {
			this.log('debug', `Cannot send command, not connected: ${cmd}`)
			return
		}
		
		let message = `QLC+API|${cmd}`
		if (params.length > 0) {
			message += `|${params.join('|')}`
		}
		
		try {
			this.ws.send(message)
			this.log('debug', `Sent command: ${message}`)
		} catch (error) {
			this.log('error', `Error sending command: ${error.message}`)
		}
	}

	sendWidgetCommand(widgetId, value) {
		if (!this.isConnected || !this.ws) {
			this.log('debug', `Cannot send widget command, not connected: ${widgetId}`)
			return
		}
		
		try {
			this.ws.send(`${widgetId}|${value}`)
			this.log('debug', `Sent widget command: ${widgetId}|${value}`)
			
			// Update our local status cache immediately
			this.widgetStatuses[widgetId] = value
			
			// Find widget name for variables
			const widget = this.widgetsList.find(w => w.id === widgetId)
			const widgetName = widget ? widget.name : 'Unknown'
			
			// Update variables
			this.setVariableValues({
				last_widget_id: widgetId,
				last_widget_name: widgetName,
				last_widget_status: value
			})
			
			// Check feedbacks that might be affected by this widget
			this.checkFeedbacks('widgetStatus')
			
			// Request the widget status to confirm the change was applied
			setTimeout(() => {
				this.sendCommand('getWidgetStatus', [widgetId])
			}, 100) // Small delay to allow QLC+ to process the command
		} catch (error) {
			this.log('error', `Error sending widget command: ${error.message}`)
		}
	}

	sendCueListCommand(cueListId, operation, step = null) {
		if (!this.isConnected || !this.ws) {
			this.log('debug', `Cannot send cue list command, not connected: ${cueListId}`)
			return
		}
		
		try {
			let command = `${cueListId}|${operation}`
			if (operation === 'STEP' && step !== null) {
				command += `|${step}`
			}
			
			this.ws.send(command)
			this.log('debug', `Sent cue list command: ${command}`)
		} catch (error) {
			this.log('error', `Error sending cue list command: ${error.message}`)
		}
	}

	sendSimpleDeskCommand(address, value) {
		if (!this.isConnected || !this.ws) {
			this.log('debug', `Cannot send simple desk command, not connected: ${address}`)
			return
		}
		
		try {
			this.ws.send(`CH|${address}|${value}`)
			this.log('debug', `Sent simple desk command: CH|${address}|${value}`)
		} catch (error) {
			this.log('error', `Error sending simple desk command: ${error.message}`)
		}
	}
	
	// Stop all functions and set all widgets to 0
	stopAll() {
		if (!this.isConnected || !this.ws) {
			this.log('debug', 'Cannot stop all, not connected')
			return
		}
		
		try {
			// Stop all functions
			if (this.functionsList && this.functionsList.length > 0) {
				this.log('info', `Stopping all ${this.functionsList.length} functions`)
				this.functionsList.forEach(func => {
					this.sendCommand('setFunctionStatus', [func.id, 'Stop'])
				})
			}
			
			// Set all widgets to 0
			if (this.widgetsList && this.widgetsList.length > 0) {
				this.log('info', `Setting all ${this.widgetsList.length} widgets to 0`)
				this.widgetsList.forEach(widget => {
					this.sendWidgetCommand(widget.id, '0')
				})
			}
			
			this.log('info', 'Stop All command completed')
		} catch (error) {
			this.log('error', `Error in Stop All command: ${error.message}`)
		}
	}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval)
			this.pollingInterval = null
		}
		
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
		
		if (this.ws) {
			this.ws.close(1000)
			this.ws = null
		}
	}

	async configUpdated(config) {
		this.config = config
		this.initConnection()
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'QLC+ IP Address',
				width: 8,
				default: '127.0.0.1',
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'QLC+ WebSocket Port',
				width: 4,
				default: '9999',
				regex: Regex.PORT,
			},
			{
				type: 'number',
				id: 'pollInterval',
				label: 'Polling interval (seconds)',
				width: 6,
				default: 10,
				min: 1,
				max: 60,
			},
		]
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
