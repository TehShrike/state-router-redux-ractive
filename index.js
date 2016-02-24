var value = require('dom-value')
var extend = require('xtend')
var redux = require('redux')

module.exports = function(stateRouter, middlewares = []) {
	var unsubscribes = {}
	var domApis = {}

	function attachToState(stateContext) {
		var { state: routerState, domApi: ractive, content: initialState } = stateContext

		if (routerState.data && routerState.data.reducer) {
			var stateMiddlewares = middlewares.slice()
			if (routerState.data.afterAction) {
				stateMiddlewares.unshift(makeChangeListener(stateContext, ractive))
			}

			var store = redux.createStore(routerState.data.reducer,
					extend(initialState, routerState.data.initialState),
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
			unsubscribes[routerState.name] = store.subscribe(() => ractive.set(store.getState()))

		}
	}
	function detatchFromState(stateName) {
		if (unsubscribes[stateName]) {
			unsubscribes[stateName]()
			delete unsubscribes[stateName]

			delete domApis[stateName].store
			delete domApis[stateName]
		}
	}
	stateRouter.on('afterCreateState', context => attachToState(context))

	stateRouter.on('beforeResetState', context => detatchFromState(context.state.name))
	stateRouter.on('afterResetState', context => attachToState(context))

	stateRouter.on('beforeDestroyState', context => detatchFromState(context.state.name))
}

function makeChangeListener(stateContext, ractive) {
	return function causeDomEffects({ getState, dispatch }) {
		return next => action => {
			var finalAction = next(action)

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
