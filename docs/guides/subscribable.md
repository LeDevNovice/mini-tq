# Subscribable & Notification Flow
## Scope 

*This guide explains what a Subscribable is, why we use it and how it behaves in TanStack Query v5. It’s written to support reading the code.*

Subscribable is a basic observation building block (a mini observable and event-emitter) in the core of TanStack Query. It doesn't know anything about React or the DOM. It just manages a list of listeners, subscription and unsubscription, and exposes lifecycle hooks (onSubscribe and onUnsubscribe).

Several core classes inherit from it to push notifications outside the Tanstack Query core. (QueryObserver, QueriesObserver, MutationObserver, QueryCache, MutationCache, but also the "global managers" focusManager and onlineManager). For example, the QueryObserver (which has a useQuery hook plugged into it on the React side) notifies its subscribers when the result changes with the use of methods provided by the Subscribable.

But in Tanstack Query, notification scheduling does not live in Subscribable. That is the role of another internal component : the notifyManager. Classes that inherit from Subscribable do not themselves implement the notion of event emitter. They call the notifyManager to centralize this strategy.
