module.exports = function (self) {
	self.setActionDefinitions({
		// Function control actions
		getFunctionsList: {
			name: 'Get Functions List',
			description: 'Retrieves the list of available functions from QLC+',
			options: [],
			callback: async () => {
				self.sendCommand('getFunctionsList')
			},
		},
		
		setFunctionStatus: {
			name: 'Set Function Status',
			description: 'Start or stop a function',
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
					default: '1',
					choices: [
						{ id: '1', label: 'Start' },
						{ id: '0', label: 'Stop' },
					],
				},
			],
			callback: async (action) => {
				self.sendCommand('setFunctionStatus', [action.options.functionId, action.options.status])
			},
		},
		
		getFunctionStatus: {
			name: 'Get Function Status',
			description: 'Get the current status of a function',
			options: [
				{
					type: 'dropdown',
					label: 'Function',
					id: 'functionId',
					default: '',
					choices: self.functionsList?.map(f => ({ id: f.id, label: f.name })) || [],
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				self.sendCommand('getFunctionStatus', [action.options.functionId])
			},
		},
		
		// Widget control actions
		getWidgetsList: {
			name: 'Get Widgets List',
			description: 'Retrieves the list of available widgets from QLC+',
			options: [],
			callback: async () => {
				self.sendCommand('getWidgetsList')
			},
		},
		
		getWidgetStatus: {
			name: 'Get Widget Status',
			description: 'Get the current status of a widget',
			options: [
				{
					type: 'dropdown',
					label: 'Widget',
					id: 'widgetId',
					default: '',
					choices: self.widgetsList?.map(w => ({ id: w.id, label: w.name })) || [],
					minChoicesForSearch: 0,
				},
			],
			callback: async (action) => {
				self.sendCommand('getWidgetStatus', [action.options.widgetId])
			},
		},
		
		// Button widget actions
		setButtonState: {
			name: 'Set Button State',
			description: 'Press or release a button widget',
			options: [
				{
					type: 'dropdown',
					label: 'Button Widget',
					id: 'widgetId',
					default: '',
					choices: self.widgetsList?.filter(w => self.widgetTypes[w.id] === 'Button').map(w => ({ id: w.id, label: w.name })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'value',
					default: '255',
					choices: [
						{ id: '255', label: 'Press' },
						{ id: '0', label: 'Release' },
					],
				},
			],
			callback: async (action) => {
				self.sendWidgetCommand(action.options.widgetId, action.options.value)
			},
		},
		
		// Audio trigger widget actions
		setAudioTriggerState: {
			name: 'Set Audio Trigger State',
			description: 'Turn an audio trigger on or off',
			options: [
				{
					type: 'dropdown',
					label: 'Audio Trigger Widget',
					id: 'widgetId',
					default: '',
					choices: self.widgetsList?.filter(w => self.widgetTypes[w.id] === 'Audio Trigger').map(w => ({ id: w.id, label: w.name })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'value',
					default: '255',
					choices: [
						{ id: '255', label: 'On' },
						{ id: '0', label: 'Off' },
					],
				},
			],
			callback: async (action) => {
				self.sendWidgetCommand(action.options.widgetId, action.options.value)
			},
		},
		
		// Slider widget actions
		setSliderValue: {
			name: 'Set Slider Value',
			description: 'Set the value of a slider widget',
			options: [
				{
					type: 'dropdown',
					label: 'Slider Widget',
					id: 'widgetId',
					default: '',
					choices: self.widgetsList?.filter(w => self.widgetTypes[w.id] === 'Slider').map(w => ({ id: w.id, label: w.name })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'number',
					label: 'Value (0-255)',
					id: 'value',
					default: 127,
					min: 0,
					max: 255,
				},
			],
			callback: async (action) => {
				self.sendWidgetCommand(action.options.widgetId, action.options.value)
			},
		},
		
		// Generic widget action (for any other widget types)
		setWidgetValue: {
			name: 'Set Widget Value (Generic)',
			description: 'Set the value of any widget type',
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
					type: 'number',
					label: 'Value (0-255)',
					id: 'value',
					default: 255,
					min: 0,
					max: 255,
				},
			],
			callback: async (action) => {
				self.sendWidgetCommand(action.options.widgetId, action.options.value)
			},
		},
		
		// Cue List control actions
		controlCueList: {
			name: 'Control Cue List',
			description: 'Control a cue list widget',
			options: [
				{
					type: 'dropdown',
					label: 'Cue List Widget',
					id: 'cueListId',
					default: '',
					choices: self.widgetsList?.filter(w => self.widgetTypes[w.id] === 'Cue list').map(w => ({ id: w.id, label: w.name })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'operation',
					default: 'PLAY',
					choices: [
						{ id: 'PLAY', label: 'Play/Stop' },
						{ id: 'NEXT', label: 'Next Step' },
						{ id: 'PREV', label: 'Previous Step' },
						{ id: 'STEP', label: 'Go to Step' },
					],
				},
				{
					type: 'number',
					label: 'Step Number (only for Go to Step)',
					id: 'step',
					default: 0,
					min: 0,
				},
			],
			callback: async (action) => {
				if (action.options.operation === 'STEP') {
					self.sendCueListCommand(action.options.cueListId, action.options.operation, action.options.step)
				} else {
					self.sendCueListCommand(action.options.cueListId, action.options.operation)
				}
			},
		},
		
		// Frame control actions
		controlFrame: {
			name: 'Control Multipage Frame',
			description: 'Control a multipage frame widget',
			options: [
				{
					type: 'dropdown',
					label: 'Frame Widget',
					id: 'frameId',
					default: '',
					choices: self.widgetsList?.filter(w => self.widgetTypes[w.id] === 'Frame').map(w => ({ id: w.id, label: w.name })) || [],
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'operation',
					default: 'NEXT_PG',
					choices: [
						{ id: 'NEXT_PG', label: 'Next Page' },
						{ id: 'PREV_PG', label: 'Previous Page' },
					],
				},
			],
			callback: async (action) => {
				self.ws.send(`${action.options.frameId}|${action.options.operation}`)
			},
		},
		
		// Simple Desk actions
		setSimpleDeskChannel: {
			name: 'Set Simple Desk Channel',
			description: 'Set a DMX channel value in Simple Desk',
			options: [
				{
					type: 'number',
					label: 'DMX Address (absolute)',
					id: 'address',
					default: 1,
					min: 1,
				},
				{
					type: 'number',
					label: 'Value (0-255)',
					id: 'value',
					default: 0,
					min: 0,
					max: 255,
				},
			],
			callback: async (action) => {
				self.sendSimpleDeskCommand(action.options.address, action.options.value)
			},
		},
		
		// Channel values actions
		getChannelsValues: {
			name: 'Get Channel Values',
			description: 'Get DMX channel values for a range',
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
					label: 'Start Address',
					id: 'address',
					default: 1,
					min: 1,
					max: 512,
				},
				{
					type: 'number',
					label: 'Number of Channels',
					id: 'range',
					default: 16,
					min: 1,
					max: 512,
				},
			],
			callback: async (action) => {
				self.sendCommand('getChannelsValues', [
					action.options.universe,
					action.options.address,
					action.options.range
				])
			},
		},
		
		// Stop All action
		stopAll: {
			name: 'Stop All',
			description: 'Stop all functions and set all widgets to 0',
			options: [],
			callback: async () => {
				self.stopAll()
			},
		},
	})
}
