module.exports = function (self) {
	self.setVariableDefinitions([
		// Connection variables
		{ variableId: 'connection_status', name: 'Connection Status' },
		{ variableId: 'connection_ip', name: 'QLC+ IP Address' },
		{ variableId: 'connection_port', name: 'QLC+ Port' },
		
		// Function variables
		{ variableId: 'functions_count', name: 'Number of Functions' },
		{ variableId: 'last_function_id', name: 'Last Used Function ID' },
		{ variableId: 'last_function_name', name: 'Last Used Function Name' },
		{ variableId: 'last_function_status', name: 'Last Function Status' },
		
		// Widget variables
		{ variableId: 'widgets_count', name: 'Number of Widgets' },
		{ variableId: 'last_widget_id', name: 'Last Used Widget ID' },
		{ variableId: 'last_widget_name', name: 'Last Used Widget Name' },
		{ variableId: 'last_widget_status', name: 'Last Widget Status' },
		
		// DMX variables
		{ variableId: 'last_dmx_universe', name: 'Last DMX Universe' },
		{ variableId: 'last_dmx_address', name: 'Last DMX Address' },
		{ variableId: 'last_dmx_value', name: 'Last DMX Value' },
	])
}
