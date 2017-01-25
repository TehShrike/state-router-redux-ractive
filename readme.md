I made this because I wanted to use [Redux](http://rackt.org/redux/) to drive some of my complicated-document views implemented with the [abstract-state-router](https://github.com/TehShrike/abstract-state-router).

# Using it in theory

You initialize it with a state router and optional middlewares.  It doesn't list any version of Redux in the package.json - it will use whatever version you add as a dependency to your project.

On any of your state, you can specify an optional initial state, reducer function, and even a function to run after the reducer step where you make any other side effects happen that you need to.

## Ractive

This module is made to work with [RactiveJS](http://www.ractivejs.org/), but as you can see from the implementation, the coupling is very light.  I would like to make it nonexistent in the future if possible.

If you are using the abstract-state-router with a different templating system and want to use Redux, fork this module - if your DOM library uses something instead of `on` to catch events, you'll need to make that change, otherwise the only thing you may need to change is the `set` method that takes the state object and applies it to the DOM object.

If you are using Ractive, just make sure to set `twoway: false` to disable two-way binding.

# Using it in practice

`npm install state-router-redux-ractive`

Initialization requires only calling the function and passing in a state router:

```js
var Ractive = require('ractive')
var ractiveRenderer = require('ractive-state-router')
var StateRouter = require('abstract-state-router')
var routerRedux = require('state-router-redux-ractive')

var renderer = ractiveRenderer(Ractive)
var stateRouter = StateRouter(, 'body')

routerRedux(stateRouter)
```

You can associate a reducer function with any of your states by adding a `reducer` property to the `data` property of any state.  Any state with a reducer can have also have an `initialState`, and/or an `afterAction` property.

```js
stateRouter.addState({
	name: 'app.topics',
	route: '/topics',
	template: {
		template: require('fs').readFileSync('implementations/ractive-redux/app/topics/topics.html', { encoding: 'utf8' }),
		twoway: false
	},
	resolve: function(data, parameters, cb) {
		all({
			topics: model.getTopics,
			tasks: model.getTasks
		}, cb)
	},
	data: {
		initialState: {
			tasksUndone: {},
			addingTopic: false
		},
		reducer: reducer,
		afterAction: switchForNamedArgs({
			START_ADDING_TOPIC: ({ domApi: ractive }) => ractive.find('.new-topic-name').focus(),
			ADD_TOPIC: ({ state, dispatch }) => state.topics.forEach(
					topicId => recalculateTasksLeftToDoInTopic(topicId, dispatch))
		})
	}
}
```

To see a "real-life" example, check out this [demo state in the state-router-example](https://github.com/TehShrike/state-router-example/blob/gh-pages/implementations/ractive-redux/app/topics/tasks/tasks.js).

The properties of `data` that are used:

- `initialState`: whatever you want Redux to be initialized with.  Any properties returned by the `resolve` function will be applied to the initial state, overwriting any duplicate properties.
- `reducer`: any regular [Redux reducer function](http://rackt.org/redux/docs/basics/Reducers.html).  Will be passed straight to Redux.
- `afterAction`: called immediately after the reducers changes are applied to the store (synchronously).  Passed these arguments:
	- `state` - the store's new value after the reducer call
	- `dispatch` - the dispatch function of the store
	- `domApi` - the active DOM API of the state.  A Ractive instance, in my case.
	- `action` - the action object that caused the whole kerfuffle

## How to dispatch actions?

These examples are Ractive, but whatever mechanism your DOM library uses for emitting events will work here.  Dispatch actions from your Ractive template like so:

```html
<button on-click="fire('dispatch', 'SET_TASK_DONE', { index: i, done: false })">
	Restore
</button>
```

To emit an action with the current contents of an input element, you can emit the `dispatchInput` event:

```html
<input type="text" on-change="fire('dispatchInput', 'SET_NEW_TOPIC', event.node)">
```

The second event argument must be the DOM element object itself.  The library will grab the value off of it for you (using [dom-value](https://github.com/npm-dom/dom-value)) and put that value on the `payload` property of the action sent to the reducer.

Those are the only two events handled at the moment.  I'm not sure if any more will be necessary/handy - we'll see!

# Develop/test

```sh
git clone https://github.com/TehShrike/state-router-redux-ractive.git
cd state-router-redux-ractive
npm install
npm test
```

Suggestions welcome.

Since this project is the glue between three sizeable libraries, I don't want to load it down with a bunch of features, but I would love to talk over any ways it could be simplified, or changed to better suit its purpose.

Open an issue or [ping me on Twitter](https://twitter.com/tehshrike) if you have any thoughts or questions!

# License

[WTFPL](http://wtfpl2.com)
