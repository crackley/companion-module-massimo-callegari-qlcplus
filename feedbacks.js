const { combineRgb } = require('@companion-module/base')

module.exports = async function (self) {
	self.setFeedbackDefinitions({
		// Function status feedback
		functionStatus: {
			type: 'boolean',
			name: 'Function Status',
			description: 'Changes style based on function running status',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Function',
					id: 'functionId',
					default: '',
					choices: self.functionsList?.map(f => ({ id: f.id, label: f.name })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Status',
					id: 'status',
					default: 'Running',
					choices: [
						{ id: 'Running', label: 'Running' },
						{ id: 'Stopped', label: 'Stopped' },
					],
				},
			],
			callback: async (feedback) => {
				if (!self.isConnected) return false
				
				// Check if we have a stored status for this function
				const functionId = feedback.options.functionId
				const expectedStatus = feedback.options.status
				const functionStatus = self.functionStatuses?.[functionId]
				
				// Debug logging
				self.log('debug', `Evaluating function status feedback for function ${functionId}`)
				self.log('debug', `Expected status: ${expectedStatus}, Actual status: ${functionStatus}`)
				self.log('debug', `All function statuses: ${JSON.stringify(self.functionStatuses)}`)
				
				// If we don't have a status yet, return false
				if (functionStatus === undefined) {
					self.log('debug', `No status available for function ${functionId}`)
					return false
				}
				
				// Compare case-insensitively
				if (functionStatus.toLowerCase() === expectedStatus.toLowerCase()) {
					self.log('debug', `Function ${functionId} status matches: ${functionStatus}`)
					return true
				}
				
				return false
			},
		},
		
		// Widget status feedback
		widgetStatus: {
			type: 'boolean',
			name: 'Widget Status',
			description: 'Changes style based on widget value (0-255)',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Widget',
					id: 'widgetId',
					default: '',
					choices: self.widgetsList?.map(w => ({ id: w.id, label: `${w.name} (${self.widgetTypes[w.id] || 'Unknown'})` })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Condition',
					id: 'condition',
					default: 'equal',
					choices: [
						{ id: 'equal', label: 'Equal to' },
						{ id: 'greater', label: 'Greater than' },
						{ id: 'less', label: 'Less than' },
					],
				},
				{
					type: 'number',
					label: 'Value (0-255)',
					id: 'value',
					default: 255,
					min: 0,
					max: 255,
				},
			],
			callback: async (feedback) => {
				if (!self.isConnected) return false
				
				// Check if we have a stored status for this widget
				const widgetStatus = self.widgetStatuses?.[feedback.options.widgetId]
				if (widgetStatus === undefined) return false
				
				// Convert to number for comparison
				const statusValue = parseInt(widgetStatus)
				const targetValue = parseInt(feedback.options.value)
				
				// Compare based on condition
				switch (feedback.options.condition) {
					case 'equal':
						return statusValue === targetValue
					case 'greater':
						return statusValue > targetValue
					case 'less':
						return statusValue < targetValue
					default:
						return false
				}
			},
		},
		
		// DMX channel value feedback
		channelValue: {
			type: 'boolean',
			name: 'DMX Channel Value',
			description: 'Changes style based on DMX channel value',
			defaultStyle: {
				bgcolor: combineRgb(0, 255, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					type: 'number',
					label: 'Universe Index',
					id: 'universe',
					default: 1,
					min: 1,
				},
				{
					type: 'number',
					label: 'DMX Address',
					id: 'address',
					default: 1,
					min: 1,
					max: 512,
				},
				{
					type: 'dropdown',
					label: 'Condition',
					id: 'condition',
					default: 'eq',
					choices: [
						{ id: 'eq', label: '=' },
						{ id: 'neq', label: '≠' },
						{ id: 'lt', label: '<' },
						{ id: 'lte', label: '≤' },
						{ id: 'gt', label: '>' },
						{ id: 'gte', label: '≥' },
					],
				},
				{
					type: 'number',
					label: 'Value',
					id: 'value',
					default: 255,
					min: 0,
					max: 255,
				},
			],
			callback: async (feedback) => {
				if (!self.isConnected) return false
				
				// Request the current channel value
				self.sendCommand('getChannelsValues', [
					feedback.options.universe,
					feedback.options.address,
					1 // Just get one channel
				])
				
				// Check if we have a stored value for this channel
				const channelKey = `${feedback.options.universe}_${feedback.options.address}`
				const channelValue = self.channelValues?.[channelKey]
				
				if (channelValue === undefined) return false
				
				// Compare based on the condition
				switch (feedback.options.condition) {
					case 'eq': return channelValue === feedback.options.value
					case 'neq': return channelValue !== feedback.options.value
					case 'lt': return channelValue < feedback.options.value
					case 'lte': return channelValue <= feedback.options.value
					case 'gt': return channelValue > feedback.options.value
					case 'gte': return channelValue >= feedback.options.value
					default: return false
				}
			},
		},
	})
}
