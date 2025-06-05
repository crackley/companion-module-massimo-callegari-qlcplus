module.exports = [
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	
	// Upgrade from v1.0.0 to v2.0.0
	function (context, props) {
		const { actions, feedbacks } = props
		const updatedActions = []
		const updatedFeedbacks = []
		
		// Handle action upgrades
		if (actions) {
			actions.forEach((action) => {
				let updatedAction = { ...action }
				
				// Handle setFunctionStatus action
				if (action.actionId === 'setFunctionStatus') {
					// Status values changed from numeric to text
					if (action.options && action.options.status) {
						// Convert from old numeric format to new text format
						if (action.options.status === '0') {
							updatedAction.options = { ...action.options, status: 'Stop' }
						} else if (action.options.status === '1') {
							updatedAction.options = { ...action.options, status: 'Run' }
						}
					}
				}
				
				// Handle setWidgetValue action which is now split into type-specific actions
				if (action.actionId === 'setWidgetValue') {
					// Keep the same action ID but note it will now use the generic widget action
					// The module will handle determining the widget type at runtime
				}
				
				updatedActions.push(updatedAction)
			})
		}
		
		// Handle feedback upgrades
		if (feedbacks) {
			feedbacks.forEach((feedback) => {
				let updatedFeedback = { ...feedback }
				
				// Handle functionState feedback which is now functionStatus
				if (feedback.feedbackId === 'functionState') {
					updatedFeedback.feedbackId = 'functionStatus'
					
					// Add the status option if it doesn't exist
					if (!feedback.options.status) {
						updatedFeedback.options = { 
							...feedback.options,
							status: 'Running' // Default to Running for existing feedbacks
						}
					}
				}
				
				updatedFeedbacks.push(updatedFeedback)
			})
		}
		
		// Config remains mostly the same
		const updatedConfig = null
		
		return {
			updatedConfig,
			updatedActions,
			updatedFeedbacks,
		}
	},
]
