# @gradual-so/sdk-react

React SDK for [Gradual](https://gradual.so) feature flags. Provides a provider and hooks for evaluating flags in React components.

## Install

```bash
npm install @gradual-so/sdk-react @gradual-so/sdk
```

## Quick start

Wrap your app with the provider:

```tsx
import { GradualProvider } from '@gradual-so/sdk-react'

function App() {
  return (
    <GradualProvider apiKey="gra_xxx" environment="production">
      <MyApp />
    </GradualProvider>
  )
}
```

Use flags in components:

```tsx
import { useFlag } from '@gradual-so/sdk-react'

function MyComponent() {
  const showBanner = useFlag('show-banner', { fallback: false })
  const theme = useFlag('theme', { fallback: 'light' })

  return (
    <div data-theme={theme}>
      {showBanner && <PromoBanner />}
    </div>
  )
}
```

The return type is inferred from `fallback` -- `boolean` for `false`, `string` for `'light'`, etc.

## User targeting

Use `useGradual` to set user context. All flag evaluations will include this context:

```tsx
import { useGradual } from '@gradual-so/sdk-react'
import { useEffect } from 'react'

function AuthHandler({ user }) {
  const { identify, reset } = useGradual()

  useEffect(() => {
    if (user) {
      identify({ userId: user.id, plan: user.plan })
    } else {
      reset()
    }
  }, [user])

  return null
}
```

Override context for a single flag:

```tsx
const enabled = useFlag('feature', {
  fallback: false,
  context: { itemId: item.id },
})
```

## Loading states

By default, `useFlag` returns the fallback value while the SDK initializes and the resolved value once ready. To distinguish between these states, use `detail: true`:

```tsx
const { value, isLoading, isReady } = useFlag('experiment', {
  fallback: 'control',
  detail: true,
})

if (isLoading) return <Skeleton />
return <Experiment variant={value} />
```

## API

### `<GradualProvider>`

Initializes the Gradual SDK and provides it to child components.

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Your Gradual API key |
| `environment` | `string` | Yes | Environment slug (e.g. `production`) |
| `baseUrl` | `string` | No | Custom API base URL |

### `useFlag(key, options)`

Returns the flag value directly, or a detail object when `detail: true`.

```typescript
// Returns T (type inferred from fallback)
const value = useFlag('key', { fallback: defaultValue })

// Returns { value: T, isLoading: boolean, isReady: boolean }
const detail = useFlag('key', { fallback: defaultValue, detail: true })
```

| Option | Type | Required | Description |
|---|---|---|---|
| `fallback` | `T` | Yes | Default value when flag is missing or SDK is loading |
| `context` | `Record<string, unknown>` | No | Evaluation context override for this flag |
| `detail` | `boolean` | No | Return `{ value, isLoading, isReady }` instead of just the value |

### `useGradual()`

Returns methods for managing user context and SDK state.

```typescript
const { identify, reset, refresh, isReady } = useGradual()
```

| Property | Type | Description |
|---|---|---|
| `identify` | `(context) => void` | Set persistent user context for all evaluations |
| `reset` | `() => void` | Clear the identified user context |
| `refresh` | `() => Promise<void>` | Fetch the latest flag snapshot from the server |
| `isReady` | `boolean` | Whether the SDK has finished initializing |

## License

MIT
