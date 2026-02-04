# @gradual-so/sdk

TypeScript SDK for [Gradual](https://gradual.so) feature flags. Works in Node.js, browsers, and edge runtimes.

## Install

```bash
npm install @gradual-so/sdk
```

## Quick start

```typescript
import { createGradual } from '@gradual-so/sdk'

const gradual = createGradual({
  apiKey: 'gra_xxx',
  environment: 'production',
})

const enabled = await gradual.isEnabled('new-feature')

const theme = await gradual.get('theme', { fallback: 'light' })
// theme is typed as string (inferred from fallback)

const limit = await gradual.get('max-items', { fallback: 10 })
// limit is typed as number
```

The SDK initializes automatically. Async methods like `isEnabled` and `get` wait for initialization before evaluating.

## User targeting

Set user context once, and it applies to all subsequent evaluations:

```typescript
gradual.identify({
  userId: 'user-123',
  email: 'eli@example.com',
  plan: 'pro',
})

const proFeature = await gradual.isEnabled('pro-feature')
```

Override context for a single evaluation:

```typescript
const enabled = await gradual.isEnabled('feature', {
  context: { region: 'eu-west' },
})
```

Clear identity:

```typescript
gradual.reset()
```

## Synchronous access

For performance-critical paths, use `sync` methods after ensuring the SDK is ready:

```typescript
await gradual.ready()

const enabled = gradual.sync.isEnabled('feature')
const theme = gradual.sync.get('theme', { fallback: 'light' })
```

`sync` methods throw if the SDK hasn't finished initializing. Use them when you've already awaited `ready()` earlier in your app lifecycle (e.g. server startup, after provider mount).

## Refreshing

Fetch the latest flag snapshot from the server:

```typescript
await gradual.refresh()
```

## API

### `createGradual(options)`

Creates a new Gradual client. Initializes automatically on creation.

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Your Gradual API key |
| `environment` | `string` | Yes | Environment slug (e.g. `production`) |
| `baseUrl` | `string` | No | Custom API base URL |

### Methods

| Method | Returns | Description |
|---|---|---|
| `isEnabled(key, options?)` | `Promise<boolean>` | Check if a boolean flag is enabled |
| `get(key, { fallback })` | `Promise<T>` | Get a typed flag value (type inferred from fallback) |
| `identify(context)` | `void` | Set persistent user context for all evaluations |
| `reset()` | `void` | Clear the identified user context |
| `ready()` | `Promise<void>` | Wait for SDK initialization |
| `isReady()` | `boolean` | Check if SDK has finished initializing |
| `refresh()` | `Promise<void>` | Fetch the latest flag snapshot |
| `sync.isEnabled(key, options?)` | `boolean` | Synchronous boolean check (throws if not ready) |
| `sync.get(key, { fallback })` | `T` | Synchronous value access (throws if not ready) |

### Context options

Both `isEnabled` and `get` accept an optional `context` object to override the identified context for that evaluation:

```typescript
await gradual.get('feature', {
  fallback: 'default',
  context: { teamId: 'team-abc' },
})
```

## React

For React apps, use [`@gradual-so/sdk-react`](https://www.npmjs.com/package/@gradual-so/sdk-react) which provides hooks and a provider component built on this SDK.

## License

MIT
