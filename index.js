var value = require('dom-value')
var extend = require('xtend')
var redux = require('redux')
var diff = require('ractive-diff-generator')

module.exports = function(stateRouter, middlewares = []) {
	var unsubscribes = {}
	var domApis = {}
	var lastStates = {}

	function attachToState(stateContext) {
		var { state: routerState, domApi: ractive, content: initialState } = stateContext

		if (routerState.data && routerState.data.reducer) {
			var stateMiddlewares = middlewares.slice()
			if (routerState.data.afterAction) {
				stateMiddlewares.unshift(makeChangeListener(stateContext, ractive))
			}

			var initialStateInStore = extend(initialState, routerState.data.initialState)
			lastStates[routerState.name] = initialStateInStore
			var store = redux.createStore(routerState.data.reducer,
					initialStateInStore,
					redux.applyMiddleware(...stateMiddlewares))

			ractive.on('dispatch', (actionType, payload) => {
				var action = {}
				if (payload && typeof payload === 'object') {
					action = payload
				}
				action.type = actionType

				store.dispatch(action)
			})
			ractive.on('dispatchInput', (actionType, node) => {
				store.dispatch({ type: actionType, payload: value(node) })
			})


			domApis[routerState.name] = ractive
			unsubscribes[routerState.name] = store.subscribe(() => {
				var newState = store.getState()
				var last = lastStates[routerState.name]
				lastStates[routerState.name] = newState

				var smartSet = last ? diff(last, newState) : newState
				ractive.set(smartSet)
			})

		}
	}
	function detatchFromState(stateName) {
		if (unsubscribes[stateName]) {
			unsubscribes[stateName]()
			delete unsubscribes[stateName]

			delete domApis[stateName].store
			delete domApis[stateName]
			delete lastStates[stateName]
		}
	}
	stateRouter.on('afterCreateState', context => attachToState(context))

	stateRouter.on('beforeResetState', context => detatchFromState(context.state.name))
	stateRouter.on('afterResetState', context => attachToState(context))

	stateRouter.on('beforeDestroyState', context => detatchFromState(context.state.name))
}

function makeChangeListener(stateContext, ractive) {
	return function causeDomEffects({ getState }) {
		return next => action => {
			var finalAction = next(action)

			function dispatch(action) {
				ractive.fire('dispatch', action.type, action)
			}

			stateContext.state.data.afterAction({
				state: getState(),
				dispatch,
				domApi: ractive,
				action,
				activeStateContext: stateContext
			})

			return finalAction
		}
	}
}
