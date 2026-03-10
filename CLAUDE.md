# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- **Build:** `npm run build` (Vite build, outputs ES module to `dist/`)
- **Test:** `npx vitest run` (Vitest — the `npm test` script is a stub, use vitest directly)
- **Run single test:** `npx vitest run src/fetcher.test.ts`
- **Format:** `npx prettier --write .`
- **Format check:** `npx prettier --check .`

No linter is configured. Formatting uses Prettier with single quotes, trailing commas, and 140 char print width.

## Architecture

This is `@cronocode/react-fetcher` — a typed HTTP client library for React built on the Fetch API.

### Core modules (all in `src/`)

- **fetcherSettings.ts** — Global config singleton. `fetcherSetup()` sets base URL, token provider (`getToken`), global headers, `onError`/`on401` callbacks.
- **fetcherObject.ts** — `FetcherObject<TSuccess, TError400, TBody, TUrlParams>` type defining a request shape: URL, method, content type, authorization mode, response type, headers.
- **fetcher.ts** — `Fetcher.go(fetcherObject, options)` executes requests. Returns `Promise<[TSuccess, TError400, Response]>` tuple. Handles header merging, body encoding (JSON/FormData), and response routing by status code (2xx→success, 400→fail400, 401→on401, other→fail).
- **useFetcher.ts** — React hook wrapping `Fetcher.go()` in `useCallback`. Returns a memoized function for component use.
- **index.ts** — Public API: exports `Fetcher` (default), `useFetcher`, `fetcherSetup`, and types `FetcherOptions`/`FetcherObject`.

### Request flow

1. App calls `fetcherSetup()` once with global config
2. Define `FetcherObject` constants describing each API endpoint
3. In components, `useFetcher(fetcherObj)` returns a callable
4. Calling it triggers `Fetcher.go()` which merges global + object + option headers, builds the body, fetches, and routes the response through callbacks

### Build & publish

Vite builds a single ES module (`dist/index.js` + `dist/index.d.ts`). React is externalized. Published to npm as `@cronocode/react-fetcher` via GitHub Actions on release creation.
