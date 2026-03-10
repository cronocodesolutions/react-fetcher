# react-fetcher

A typed HTTP client for React applications built on the Fetch API. Define your API endpoints as typed objects and call them with full TypeScript support for request bodies, URL parameters, and response types.

## Installation

```bash
npm install @cronocode/react-fetcher
```

## Quick Start

### 1. Configure global settings

Call `fetcherSetup` once at the root of your application:

```tsx
import { fetcherSetup } from '@cronocode/react-fetcher';

fetcherSetup({
  base: 'https://api.example.com',
  getToken: async () => localStorage.getItem('token') || undefined,
  headers: () => ({ 'X-Custom-Header': 'value' }),
  onError: ({ url, error, response, status }) => {
    console.error(`Request failed [${status}]: ${url}`, error);
  },
  on401: () => {
    // redirect to login
  },
  on403: () => {
    // redirect to "access denied" page
  },
});
```

### 2. Define API endpoints

Create typed `FetcherObject` constants that describe each endpoint:

```tsx
import { FetcherObject } from '@cronocode/react-fetcher';

interface User {
  id: number;
  name: string;
  email: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// GET request
const getUsers: FetcherObject<User[]> = {
  url: '/users',
};

// GET with URL parameters
const getUser: FetcherObject<User, unknown, unknown, { id: number }> = {
  url: (params) => `/users/${params.id}`,
};

// POST with typed body and error response
interface CreateUserBody {
  name: string;
  email: string;
}

const createUser: FetcherObject<User, ValidationError, CreateUserBody> = {
  url: '/users',
  method: 'POST',
};
```

### 3. Use in React components

```tsx
import { useFetcher } from '@cronocode/react-fetcher';

function UserList() {
  const fetchUsers = useFetcher(getUsers);

  async function loadUsers() {
    const [data, error, response] = await fetchUsers({
      success: (users) => console.log('Loaded', users.length, 'users'),
      fail: ({ error }) => console.error('Failed to load users', error),
      always: () => console.log('Request completed'),
    });

    if (data) {
      // data is typed as User[]
    }
  }

  return <button onClick={loadUsers}>Load Users</button>;
}
```

### 4. Use outside React

You can also call `Fetcher.go` directly without the hook:

```tsx
import Fetcher from '@cronocode/react-fetcher';

const [user, validationError, response] = await Fetcher.go(createUser, {
  body: { name: 'John', email: 'john@example.com' },
  fail400: (error) => console.log('Validation failed:', error),
});
```

## API Reference

### `fetcherSetup(settings)`

Configures global settings. Call once at app startup.

| Setting | Type | Description |
|---------|------|-------------|
| `base` | `string` | Base URL prepended to all relative request URLs |
| `getToken` | `() => Promise<string \| undefined>` | Async function that returns a Bearer token |
| `headers` | `() => Record<string, string>` | Function returning headers added to every request |
| `onError` | `(data: FetcherError) => void` | Global error callback for non-2xx responses |
| `on401` | `() => void` | Called on 401 responses (e.g. redirect to login) |
| `on403` | `() => void` | Called on 403 responses (e.g. redirect to access denied page) |

### `FetcherObject<TSuccess, TError400, TBody, TUrlParams>`

Describes an API endpoint.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | `string \| (params: TUrlParams) => string` | *required* | Request URL (relative to base, or absolute) |
| `urlType` | `'relative' \| 'absolute'` | `'relative'` | Set to `'absolute'` to skip base URL prepending |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | `'GET'` | HTTP method |
| `contentType` | `'application/json' \| 'multipart/form-data' \| 'none'` | `'application/json'` | Request content type |
| `authorization` | `'token' \| 'anonymous'` | `'token'` | Set to `'anonymous'` to skip Bearer token |
| `responseType` | `'json' \| 'blob' \| 'text' \| 'empty'` | `'json'` | How to parse the success response body |
| `errorResponseType` | `'json' \| 'blob' \| 'text' \| 'empty'` | `'json'` | How to parse error response bodies (used by `fail400` and `onStatus`) |
| `headers` | `Record<string, string>` | — | Extra headers for this endpoint |
| `ignoreGlobalHeaders` | `boolean` | `false` | Skip global headers from `fetcherSetup` |
| `mode` | `RequestMode` | — | Fetch API request mode (e.g. `'cors'`) |
| `name` | `string` | — | Label included in error callbacks for debugging |

### `useFetcher(fetcherObject)`

React hook that returns a memoized function to execute the request.

```tsx
const doRequest = useFetcher(fetcherObject);
const [success, error400, response] = await doRequest(options);
```

### `Fetcher.go(fetcherObject, options?)`

Executes a request directly. Returns a promise with a three-element tuple:

- **2xx response:** `[TSuccess, undefined, Response]`
- **400 response:** `[undefined, TError400, Response]`
- **Other errors:** `[undefined, undefined, Response | undefined]`

### `FetcherOptions<TSuccess, TError400, TBody, TUrlParams>`

Options passed when executing a request.

| Option | Type | Description |
|--------|------|-------------|
| `urlParams` | `TUrlParams` | Parameters passed to the URL function |
| `body` | `TBody` | Request body (auto-serialized based on content type) |
| `headers` | `Record<string, string>` | Additional headers for this request |
| `success` | `(result: TSuccess) => void` | Called on 2xx response |
| `fail400` | `(result: TError400) => void` | Called on 400 response |
| `fail` | `(data: FetcherError) => void` | Called on any non-2xx response (also called on 400 if `fail400` is not provided) |
| `always` | `() => void` | Called after every request completes |
| `onStatus` | `Partial<Record<number, (body: any, response: Response) => void>>` | Handle specific HTTP status codes with parsed response bodies |

### `FetcherError`

The error object passed to `fail` and `onError` callbacks.

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | The request URL |
| `error` | `any` | The error or parsed response body |
| `response` | `Response \| undefined` | The raw Response object (undefined for network errors) |
| `status` | `number \| undefined` | The HTTP status code (undefined for network errors) |
| `name` | `string \| undefined` | The `name` from the FetcherObject, for debugging |
| `body` | `BodyInit \| undefined` | The serialized request body |

## Response Handling

The library routes responses by status code in this order:

| Status | Behavior |
|--------|----------|
| **200–299** | Calls `success` callback, returns `[data, undefined, response]` |
| **204/205** | Auto-detected as no-content — returns `[null, undefined, response]` without parsing the body |
| **onStatus match** | If `onStatus[code]` is provided, calls it with the parsed body, calls `onError`, returns `[undefined, parsedBody, response]` |
| **400** | Calls `fail400` callback (or `fail` if `fail400` not provided), calls global `onError`, returns `[undefined, errorData, response]` |
| **401** | Calls global `on401` handler, then throws |
| **403** | Calls global `on403` handler, then throws |
| **Other errors** | Calls `fail` callback and global `onError`, returns `[undefined, undefined, response]` |

**Precedence:** `onStatus` is checked before built-in status handlers. If you provide `onStatus[400]`, it takes priority over `fail400`. If you provide `onStatus[401]`, it takes priority over the global `on401`.

## Header Priority

Headers are merged in this order (later values override earlier):

1. Global headers (from `fetcherSetup.headers`)
2. Endpoint headers (from `FetcherObject.headers`)
3. Request headers (from `FetcherOptions.headers`)

Set `ignoreGlobalHeaders: true` on a `FetcherObject` to skip step 1.

## Handling Specific Status Codes

Use `onStatus` to handle any HTTP status code with a parsed response body. This is useful for APIs that return structured errors on status codes like 422 (validation), 409 (conflict), or 403 (forbidden):

```tsx
const [user, error] = await Fetcher.go(createUser, {
  body: { name: 'John', email: 'john@example.com' },
  onStatus: {
    422: (validationErrors) => {
      // validationErrors is the parsed response body
      setFormErrors(validationErrors);
    },
    409: (conflict) => {
      showDuplicateWarning(conflict);
    },
  },
  fail: ({ status, error }) => {
    // Catches any other non-2xx status not handled above
    console.error(`Unexpected error [${status}]:`, error);
  },
  always: () => setLoading(false),
});
```

When an `onStatus` handler matches, the response body is parsed using `errorResponseType` (defaults to JSON). The `fail` callback is **not** called for statuses handled by `onStatus`.

## 204 No Content

Responses with status 204 or 205 are automatically detected and return `null` as the success value, without attempting to parse the response body. You don't need to set `responseType: 'empty'`:

```tsx
const deleteUser: FetcherObject<null, unknown, unknown, { id: number }> = {
  url: (params) => `/users/${params.id}`,
  method: 'DELETE',
};

const [result] = await Fetcher.go(deleteUser, { urlParams: { id: 42 } });
// result is null — no crash even though responseType defaults to 'json'
```

## File Uploads

Use `multipart/form-data` content type for file uploads:

```tsx
const uploadFile: FetcherObject<{ fileId: string }, unknown, { file: File; description: string }> = {
  url: '/upload',
  method: 'POST',
  contentType: 'multipart/form-data',
};

const doUpload = useFetcher(uploadFile);

await doUpload({
  body: { file: selectedFile, description: 'My document' },
});
```

## Anonymous Requests

Skip the Bearer token for public endpoints:

```tsx
const publicEndpoint: FetcherObject<PublicData> = {
  url: '/public/data',
  authorization: 'anonymous',
};
```

## License

ISC
