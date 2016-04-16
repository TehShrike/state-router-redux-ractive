var test = require('tape-catch')
var setUpReduxForStateRouter = require('.')
var stateFactory = require('abstract-state-router/test/helpers/test-state-factory')
var EventEmitter = require('events').EventEmitter


function createMockRendererFactory(emitter) {
	emitter.set = function(newState) {
		emitter.state = newState
	}
	emitter.fire = emitter.emit
	return function makeRenderer(stateRouter) {
		return {
			render: function render(context, cb) {
				cb(null, emitter)
			},
			reset: function reset(context, cb) {
				setTimeout(cb, 100)
			},
			destroy: function destroy(renderedTemplateApi, cb) {
				setTimeout(cb, 100)
			},
			getChildElement: function getChildElement(renderedTemplateApi, cb) {
				cb(null, emitter)
			}
		}
	}
}

test('works like I\'d expect', function(t) {
	var emitter = new EventEmitter()
	var mockFactory = createMockRendererFactory(emitter)
	var testState = stateFactory(t, mockFactory, { throwOnError: true })

	t.plan(8)
	t.timeoutAfter(500)

	var reducerCalled = false

	const blurghState = {
		name: 'blurgh',
		route: 'blurgh',
		template: '',
		data: {
			initialState: {
				value: 'totally legit'
			},
			reducer: function(state, action) {
				if (action.type === '@@redux/INIT') {
					t.equal(state.value, 'totally legit')
					return state
				} else {
					t.equal(action.type, 'WAT')
					t.equal(action.thingy, 13)
					reducerCalled = true
					return {
						newState: true
					}
				}
			},
			afterAction: function(args) {
				t.ok(reducerCalled)
				t.equal(args.action.type, 'WAT')
				t.equal(args.state.newState, true)
				t.equal(args.activeStateContext.state, blurghState)
				t.ok(args.activeStateContext.domApi)
				t.end()
			}
		},
		activate: function() {
			emitter.emit('dispatch', 'WAT', {
				thingy: 13
			})
		}
	}

	testState.stateRouter.addState(blurghState)

	setUpReduxForStateRouter(testState.stateRouter)

	testState.stateRouter.go('blurgh')
})

test('dispatching from afterAction emits "dispatch" on the domApi', function(t) {
	var emitter = new EventEmitter()

	var rewateningReduced = false
	var actionDispatched = false

	var watCalled = false
	emitter.on('dispatch', function(type, action) {
		if (type === 'WAT') {
			watCalled = true
		} else if (watCalled) {
			t.equal(type, 'THE_RE_WATENING', 'THE_RE_WATENING dispatch event was emitted')
			actionDispatched = true
		}
	})

	var mockFactory = createMockRendererFactory(emitter)
	var testState = stateFactory(t, mockFactory, { throwOnError: true })

	t.timeoutAfter(500)

	const blurghState = {
		name: 'blurgh',
		route: 'blurgh',
		template: '',
		data: {
			initialState: {
				value: 'totally legit'
			},
			reducer: function(state, action) {
				if (action.type !== '@@redux/INIT' && action.type !== 'WAT') {
					t.equal(action.type, 'THE_RE_WATENING', 'action type is THE_RE_WATENING')
					rewateningReduced = true
					t.equal(action.thinger, 420, 'correct re-watening value')
				}
				return state
			},
			afterAction: function(args) {
				if (args.action.type === 'WAT') {
					args.dispatch({
						type: 'THE_RE_WATENING',
						thinger: 420
					})
				} else if (args.action.type === 'THE_RE_WATENING') {
					t.ok(rewateningReduced, 'THE_RE_WATENING was reduced before afterAction')
					t.ok(actionDispatched, 'the dispatch event was emitted already')
					t.end()
				}
			}
		},
		activate: function() {
			emitter.emit('dispatch', 'WAT', {
				thingy: 13
			})
		}
	}

	testState.stateRouter.addState(blurghState)

	setUpReduxForStateRouter(testState.stateRouter)

	testState.stateRouter.go('blurgh')
})

test('middlewares', function(t) {
	var emitter = new EventEmitter()
	var mockFactory = createMockRendererFactory(emitter)
	var testState = stateFactory(t, mockFactory, { throwOnError: true })

	t.plan(5)
	t.timeoutAfter(500)

	var reducerCalled = false

	testState.stateRouter.addState({
		name: 'blurgh',
		route: 'blurgh',
		template: '',
		data: {
			reducer: function(state, action) {
				if (action.type !== '@@redux/INIT') {
					reducerCalled = true
					return {
						newState: true
					}
				}

				return {
					initialState: true
				}
			},
			afterAction: function(args) {
				t.end()
			}
		},
		activate: function() {
			emitter.emit('dispatch', 'WAT', {
				thingy: 13
			})
		}
	})

	function aMiddleware(context) {
		t.equal(typeof context.getState, 'function')
		t.equal(typeof context.dispatch, 'function')
		return function(next) {
			return function(action) {
				t.notOk(reducerCalled)
				t.equal(action.type, 'WAT')
				next(action)
				t.ok(reducerCalled)

				return action
			}
		}
	}

	setUpReduxForStateRouter(testState.stateRouter, [aMiddleware])

	testState.stateRouter.go('blurgh')
})
