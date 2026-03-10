import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fetcher from './fetcher';
import { fetcherSetup } from '.';

const mockFetch = (status: number, body: any = {}, responseType: 'json' | 'text' = 'json') => {
  const responseBody = responseType === 'json' ? JSON.stringify(body) : body;
  return vi.fn(async () => new Response(responseBody, { status }));
};

describe('fetcher', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetcherSetup({});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // --- Success responses (2xx) ---

  describe('success responses', () => {
    it('returns success tuple for 200', async () => {
      globalThis.fetch = mockFetch(200, { id: 1 });

      const [success, error400, response] = await Fetcher.go({ url: '/test' });

      expect(success).toEqual({ id: 1 });
      expect(error400).toBeUndefined();
      expect(response?.status).toBe(200);
    });

    it('returns success for 201', async () => {
      globalThis.fetch = mockFetch(201, { created: true });

      const [success] = await Fetcher.go({ url: '/test' });

      expect(success).toEqual({ created: true });
    });

    it('returns success for 204 with empty responseType', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));

      const [success, , response] = await Fetcher.go({ url: '/test', responseType: 'empty' });

      expect(success).toBeNull();
      expect(response?.status).toBe(204);
    });

    it('calls success callback', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });
      const successCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { success: successCb });

      expect(successCb).toHaveBeenCalledWith({ ok: true });
    });

    it('calls always callback on success', async () => {
      globalThis.fetch = mockFetch(200, {});
      const alwaysCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { always: alwaysCb });

      expect(alwaysCb).toHaveBeenCalledOnce();
    });
  });

  // --- 400 responses ---

  describe('400 responses', () => {
    it('returns error400 tuple for status 400', async () => {
      globalThis.fetch = mockFetch(400, { field: 'email', message: 'invalid' });

      const [success, error400, response] = await Fetcher.go({ url: '/test' });

      expect(success).toBeUndefined();
      expect(error400).toEqual({ field: 'email', message: 'invalid' });
      expect(response?.status).toBe(400);
    });

    it('calls fail400 callback', async () => {
      globalThis.fetch = mockFetch(400, { error: 'bad' });
      const fail400Cb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail400: fail400Cb });

      expect(fail400Cb).toHaveBeenCalledWith({ error: 'bad' });
    });

    it('calls fail when fail400 is not provided', async () => {
      globalThis.fetch = mockFetch(400, { error: 'bad' });
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb });

      expect(failCb).toHaveBeenCalledOnce();
      expect(failCb.mock.calls[0][0].url).toBe('/test');
      expect(failCb.mock.calls[0][0].error).toEqual({ error: 'bad' });
    });

    it('does NOT call fail when fail400 IS provided', async () => {
      globalThis.fetch = mockFetch(400, {});
      const failCb = vi.fn();
      const fail400Cb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb, fail400: fail400Cb });

      expect(fail400Cb).toHaveBeenCalledOnce();
      expect(failCb).not.toHaveBeenCalled();
    });

    it('calls onError on 400', async () => {
      const onError = vi.fn();
      fetcherSetup({ onError });
      globalThis.fetch = mockFetch(400, {});

      await Fetcher.go({ url: '/test' });

      expect(onError).toHaveBeenCalledOnce();
    });

    it('calls always callback on 400', async () => {
      globalThis.fetch = mockFetch(400, {});
      const alwaysCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { always: alwaysCb });

      expect(alwaysCb).toHaveBeenCalledOnce();
    });

    it('reads 400 response using errorResponseType', async () => {
      globalThis.fetch = vi.fn(async () => new Response('plain error text', { status: 400 }));
      const fail400Cb = vi.fn();

      await Fetcher.go({ url: '/test', errorResponseType: 'text' }, { fail400: fail400Cb });

      expect(fail400Cb).toHaveBeenCalledWith('plain error text');
    });
  });

  // --- Error responses (non-400) ---

  describe('error responses', () => {
    it('returns undefined tuple for 500', async () => {
      globalThis.fetch = mockFetch(500);

      const [success, error400, response] = await Fetcher.go({ url: '/test' });

      expect(success).toBeUndefined();
      expect(error400).toBeUndefined();
      expect(response?.status).toBe(500);
    });

    it('calls fail callback on 500', async () => {
      globalThis.fetch = mockFetch(500);
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb });

      expect(failCb).toHaveBeenCalledOnce();
    });

    it('calls onError on 500', async () => {
      const onError = vi.fn();
      fetcherSetup({ onError });
      globalThis.fetch = mockFetch(500);

      await Fetcher.go({ url: '/test' });

      expect(onError).toHaveBeenCalledOnce();
    });

    it('calls always callback on error', async () => {
      globalThis.fetch = mockFetch(500);
      const alwaysCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { always: alwaysCb });

      expect(alwaysCb).toHaveBeenCalledOnce();
    });

    it('calls on401 on 401 status', async () => {
      const on401 = vi.fn();
      fetcherSetup({ on401 });
      globalThis.fetch = mockFetch(401);

      await Fetcher.go({ url: '/test' });

      expect(on401).toHaveBeenCalledOnce();
    });

    it('handles network error (fetch throws)', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('Network error');
      });
      const failCb = vi.fn();
      const alwaysCb = vi.fn();

      const [success, error400, response] = await Fetcher.go({ url: '/test' }, { fail: failCb, always: alwaysCb });

      expect(success).toBeUndefined();
      expect(error400).toBeUndefined();
      expect(response).toBeUndefined();
      expect(failCb).toHaveBeenCalledOnce();
      expect(failCb.mock.calls[0][0].error).toBeInstanceOf(Error);
      expect(alwaysCb).toHaveBeenCalledOnce();
    });

    it('calls onError on network error', async () => {
      const onError = vi.fn();
      fetcherSetup({ onError });
      globalThis.fetch = vi.fn(async () => {
        throw new Error('fail');
      });

      await Fetcher.go({ url: '/test' });

      expect(onError).toHaveBeenCalledOnce();
    });
  });

  // --- URL handling ---

  describe('URL handling', () => {
    it('prepends base URL to relative URL', async () => {
      fetcherSetup({ base: 'https://api.example.com' });
      globalThis.fetch = mockFetch(200);

      await Fetcher.go({ url: '/users' });

      expect(globalThis.fetch).toHaveBeenCalledWith('https://api.example.com/users', expect.anything());
    });

    it('uses absolute URL when urlType is absolute and base is set', async () => {
      fetcherSetup({ base: 'https://api.example.com' });
      globalThis.fetch = mockFetch(200);

      await Fetcher.go({ url: 'https://other.com/data', urlType: 'absolute' });

      expect(globalThis.fetch).toHaveBeenCalledWith('https://other.com/data', expect.anything());
    });

    it('calls url function with urlParams', async () => {
      globalThis.fetch = mockFetch(200);
      const urlFn = vi.fn((params: { id: number }) => `/users/${params.id}`);

      await Fetcher.go({ url: urlFn }, { urlParams: { id: 42 } });

      expect(urlFn).toHaveBeenCalledWith({ id: 42 });
      expect(globalThis.fetch).toHaveBeenCalledWith('/users/42', expect.anything());
    });

    it('prepends base to dynamic URL', async () => {
      fetcherSetup({ base: 'https://api.test.com' });
      globalThis.fetch = mockFetch(200);

      await Fetcher.go({ url: (p: { id: number }) => `/items/${p.id}` }, { urlParams: { id: 5 } });

      expect(globalThis.fetch).toHaveBeenCalledWith('https://api.test.com/items/5', expect.anything());
    });
  });

  // --- Headers ---

  describe('headers', () => {
    it('GET request should not include Content-Type header', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'GET' });

      expect(capturedHeaders['content-type']).toBeUndefined();
    });

    it('HEAD request should not include Content-Type header', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'GET' });

      expect(capturedHeaders['content-type']).toBeUndefined();
    });

    it('POST request should include Content-Type application/json by default', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'POST' });

      expect(capturedHeaders['content-type']).toBe('application/json');
    });

    it('PUT request should include Content-Type application/json', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'PUT' });

      expect(capturedHeaders['content-type']).toBe('application/json');
    });

    it('DELETE request should include Content-Type application/json', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'DELETE' });

      expect(capturedHeaders['content-type']).toBe('application/json');
    });

    it('includes Authorization header when getToken is set', async () => {
      fetcherSetup({ getToken: async () => 'my-token-123' });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test' });

      expect(capturedHeaders.Authorization).toBe('Bearer my-token-123');
    });

    it('skips Authorization header when authorization is anonymous', async () => {
      fetcherSetup({ getToken: async () => 'secret' });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', authorization: 'anonymous' });

      expect(capturedHeaders.Authorization).toBeUndefined();
    });

    it('merges global headers', async () => {
      fetcherSetup({ headers: () => ({ 'X-Custom': 'global-value' }) });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test' });

      expect(capturedHeaders['X-Custom']).toBe('global-value');
    });

    it('ignores global headers when ignoreGlobalHeaders is true', async () => {
      fetcherSetup({ headers: () => ({ 'X-Global': 'should-not-appear' }) });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', ignoreGlobalHeaders: true });

      expect(capturedHeaders['X-Global']).toBeUndefined();
    });

    it('object headers override global headers', async () => {
      fetcherSetup({ headers: () => ({ 'X-Key': 'global' }) });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', headers: { 'X-Key': 'object' } });

      expect(capturedHeaders['X-Key']).toBe('object');
    });

    it('option headers override object headers', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', headers: { 'X-Key': 'object' } }, { headers: { 'X-Key': 'option' } });

      expect(capturedHeaders['X-Key']).toBe('option');
    });

    it('merges all three header levels correctly', async () => {
      fetcherSetup({ headers: () => ({ 'X-Global': 'g', 'X-Shared': 'global' }) });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go(
        { url: '/test', headers: { 'X-Object': 'o', 'X-Shared': 'object' } },
        { headers: { 'X-Option': 'opt', 'X-Shared': 'option' } },
      );

      expect(capturedHeaders['X-Global']).toBe('g');
      expect(capturedHeaders['X-Object']).toBe('o');
      expect(capturedHeaders['X-Option']).toBe('opt');
      expect(capturedHeaders['X-Shared']).toBe('option');
    });

    it('does not set content-type when contentType is explicitly set for POST', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'POST', contentType: 'multipart/form-data' });

      // multipart/form-data is not 'application/json' and not undefined, so content-type should not be set by the header logic
      expect(capturedHeaders['content-type']).toBeUndefined();
    });
  });

  // --- Body handling ---

  describe('body handling', () => {
    it('sends JSON body for POST with default contentType', async () => {
      let capturedBody: BodyInit | undefined;
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedBody = init?.body as BodyInit;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'POST' }, { body: { name: 'John' } });

      expect(capturedBody).toBe(JSON.stringify({ name: 'John' }));
    });

    it('sends JSON body when contentType is application/json', async () => {
      let capturedBody: BodyInit | undefined;
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedBody = init?.body as BodyInit;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'POST', contentType: 'application/json' }, { body: { x: 1 } });

      expect(capturedBody).toBe(JSON.stringify({ x: 1 }));
    });

    it('sends FormData body for multipart/form-data', async () => {
      let capturedBody: BodyInit | undefined;
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedBody = init?.body as BodyInit;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'POST', contentType: 'multipart/form-data' }, { body: { file: 'data', name: 'test' } });

      expect(capturedBody).toBeInstanceOf(FormData);
      expect((capturedBody as FormData).get('file')).toBe('data');
      expect((capturedBody as FormData).get('name')).toBe('test');
    });

    it('sends undefined body when no body is provided', async () => {
      let capturedBody: BodyInit | null | undefined;
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedBody = init?.body;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test', method: 'POST' });

      expect(capturedBody).toBeUndefined();
    });

    it('sends raw body when contentType is none', async () => {
      let capturedBody: BodyInit | undefined;
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedBody = init?.body as BodyInit;
        return new Response('{}', { status: 200 });
      });

      const rawBody = 'raw-string-body';
      await Fetcher.go({ url: '/test', method: 'POST', contentType: 'none' }, { body: rawBody as any });

      expect(capturedBody).toBe(rawBody);
    });
  });

  // --- Response type handling ---

  describe('response types', () => {
    it('reads JSON response by default', async () => {
      globalThis.fetch = mockFetch(200, { key: 'value' });

      const [success] = await Fetcher.go({ url: '/test' });

      expect(success).toEqual({ key: 'value' });
    });

    it('reads text response', async () => {
      globalThis.fetch = vi.fn(async () => new Response('hello world', { status: 200 }));

      const [success] = await Fetcher.go({ url: '/test', responseType: 'text' });

      expect(success).toBe('hello world');
    });

    it('reads blob response', async () => {
      globalThis.fetch = vi.fn(async () => new Response('blob-data', { status: 200 }));

      const [success] = await Fetcher.go({ url: '/test', responseType: 'blob' });

      expect(success).toBeInstanceOf(Blob);
    });

    it('reads empty response', async () => {
      globalThis.fetch = mockFetch(200);

      const [success] = await Fetcher.go({ url: '/test', responseType: 'empty' });

      expect(success).toBeNull();
    });
  });

  // --- Fetch call options ---

  describe('fetch call options', () => {
    it('passes method to fetch', async () => {
      globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 }));

      await Fetcher.go({ url: '/test', method: 'PATCH' });

      expect(globalThis.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'PATCH' }));
    });

    it('passes mode to fetch', async () => {
      globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 }));

      await Fetcher.go({ url: '/test', mode: 'cors' });

      expect(globalThis.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ mode: 'cors' }));
    });
  });

  // --- FetcherError shape ---

  describe('FetcherError shape', () => {
    it('passes name and body in error callback', async () => {
      globalThis.fetch = mockFetch(500);
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test', method: 'POST', name: 'createUser' }, { body: { x: 1 }, fail: failCb });

      const errorArg = failCb.mock.calls[0][0];
      expect(errorArg.url).toBe('/test');
      expect(errorArg.name).toBe('createUser');
      expect(errorArg.body).toBe(JSON.stringify({ x: 1 }));
      expect(errorArg.response).toBeDefined();
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles undefined options gracefully', async () => {
      globalThis.fetch = mockFetch(200, { ok: true });

      const [success] = await Fetcher.go({ url: '/test' });

      expect(success).toEqual({ ok: true });
    });

    it('does not fail when no callbacks are provided on error', async () => {
      globalThis.fetch = mockFetch(500);

      const [success, error400] = await Fetcher.go({ url: '/test' });

      expect(success).toBeUndefined();
      expect(error400).toBeUndefined();
    });

    it('handles getToken returning undefined', async () => {
      fetcherSetup({ getToken: async () => undefined });
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test' });

      expect(capturedHeaders.Authorization).toBe('Bearer undefined');
    });

    it('works without method specified', async () => {
      globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 }));

      await Fetcher.go({ url: '/test' });

      expect(globalThis.fetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: undefined }));
    });

    it('does not set content-type when method is undefined (no body methods)', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn(async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response('{}', { status: 200 });
      });

      await Fetcher.go({ url: '/test' });

      expect(capturedHeaders['content-type']).toBeUndefined();
    });
  });

  // --- 204/205 auto-detect ---

  describe('204/205 auto-detect', () => {
    it('returns null for 204 without setting responseType to empty', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));

      const [success, , response] = await Fetcher.go({ url: '/test' });

      expect(success).toBeNull();
      expect(response?.status).toBe(204);
    });

    it('returns null for 205 without setting responseType to empty', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 205 }));

      const [success, , response] = await Fetcher.go({ url: '/test' });

      expect(success).toBeNull();
      expect(response?.status).toBe(205);
    });

    it('returns null for 204 even when responseType is json (default)', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));

      const [success] = await Fetcher.go({ url: '/test', responseType: 'json' });

      expect(success).toBeNull();
    });

    it('calls success callback with null for 204', async () => {
      globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
      const successCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { success: successCb });

      expect(successCb).toHaveBeenCalledWith(null);
    });
  });

  // --- onStatus callback map ---

  describe('onStatus', () => {
    it('handles 422 with onStatus callback', async () => {
      globalThis.fetch = mockFetch(422, { field: 'email', message: 'already exists' });
      const onStatusCb = vi.fn();

      const [success, error400, response] = await Fetcher.go({ url: '/test' }, { onStatus: { 422: onStatusCb } });

      expect(onStatusCb).toHaveBeenCalledWith({ field: 'email', message: 'already exists' }, expect.any(Response));
      expect(success).toBeUndefined();
      expect(error400).toEqual({ field: 'email', message: 'already exists' });
      expect(response?.status).toBe(422);
    });

    it('handles 409 with onStatus callback', async () => {
      globalThis.fetch = mockFetch(409, { conflict: 'duplicate entry' });
      const onStatusCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 409: onStatusCb } });

      expect(onStatusCb).toHaveBeenCalledWith({ conflict: 'duplicate entry' }, expect.any(Response));
    });

    it('calls onError when onStatus handles a status', async () => {
      const onError = vi.fn();
      fetcherSetup({ onError });
      globalThis.fetch = mockFetch(422, { error: 'validation' });

      await Fetcher.go({ url: '/test' }, { onStatus: { 422: vi.fn() } });

      expect(onError).toHaveBeenCalledOnce();
    });

    it('calls always when onStatus handles a status', async () => {
      globalThis.fetch = mockFetch(422, {});
      const alwaysCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 422: vi.fn() }, always: alwaysCb });

      expect(alwaysCb).toHaveBeenCalledOnce();
    });

    it('onStatus prevents fail from being called', async () => {
      globalThis.fetch = mockFetch(422, {});
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 422: vi.fn() }, fail: failCb });

      expect(failCb).not.toHaveBeenCalled();
    });

    it('onStatus[400] takes priority over fail400', async () => {
      globalThis.fetch = mockFetch(400, { error: 'bad' });
      const onStatusCb = vi.fn();
      const fail400Cb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 400: onStatusCb }, fail400: fail400Cb });

      expect(onStatusCb).toHaveBeenCalledOnce();
      expect(fail400Cb).not.toHaveBeenCalled();
    });

    it('onStatus[401] takes priority over global on401', async () => {
      const on401 = vi.fn();
      fetcherSetup({ on401 });
      globalThis.fetch = mockFetch(401, { message: 'unauthorized' });
      const onStatusCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 401: onStatusCb } });

      expect(onStatusCb).toHaveBeenCalledOnce();
      expect(on401).not.toHaveBeenCalled();
    });

    it('falls through to default handling when onStatus does not match', async () => {
      globalThis.fetch = mockFetch(500);
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 422: vi.fn() }, fail: failCb });

      expect(failCb).toHaveBeenCalledOnce();
    });

    it('reads response body using errorResponseType', async () => {
      globalThis.fetch = vi.fn(async () => new Response('text error', { status: 422 }));
      const onStatusCb = vi.fn();

      await Fetcher.go({ url: '/test', errorResponseType: 'text' }, { onStatus: { 422: onStatusCb } });

      expect(onStatusCb).toHaveBeenCalledWith('text error', expect.any(Response));
    });

    it('handles multiple status codes in onStatus map', async () => {
      globalThis.fetch = mockFetch(409, { reason: 'conflict' });
      const on422 = vi.fn();
      const on409 = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 422: on422, 409: on409 } });

      expect(on409).toHaveBeenCalledOnce();
      expect(on422).not.toHaveBeenCalled();
    });
  });

  // --- on403 global hook ---

  describe('on403', () => {
    it('calls on403 on 403 status', async () => {
      const on403 = vi.fn();
      fetcherSetup({ on403 });
      globalThis.fetch = mockFetch(403);

      await Fetcher.go({ url: '/test' });

      expect(on403).toHaveBeenCalledOnce();
    });

    it('still calls fail after on403', async () => {
      fetcherSetup({ on403: vi.fn() });
      globalThis.fetch = mockFetch(403);
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb });

      expect(failCb).toHaveBeenCalledOnce();
    });

    it('still calls onError after on403', async () => {
      const onError = vi.fn();
      fetcherSetup({ on403: vi.fn(), onError });
      globalThis.fetch = mockFetch(403);

      await Fetcher.go({ url: '/test' });

      expect(onError).toHaveBeenCalledOnce();
    });

    it('onStatus[403] takes priority over global on403', async () => {
      const on403 = vi.fn();
      fetcherSetup({ on403 });
      globalThis.fetch = mockFetch(403, { reason: 'forbidden' });
      const onStatusCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { onStatus: { 403: onStatusCb } });

      expect(onStatusCb).toHaveBeenCalledOnce();
      expect(on403).not.toHaveBeenCalled();
    });
  });

  // --- status field in FetcherError ---

  describe('status in FetcherError', () => {
    it('includes status in fail callback on 400', async () => {
      globalThis.fetch = mockFetch(400, {});
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb });

      expect(failCb.mock.calls[0][0].status).toBe(400);
    });

    it('includes status in onError callback on 400', async () => {
      const onError = vi.fn();
      fetcherSetup({ onError });
      globalThis.fetch = mockFetch(400, {});

      await Fetcher.go({ url: '/test' });

      expect(onError.mock.calls[0][0].status).toBe(400);
    });

    it('includes status in fail callback on 500', async () => {
      globalThis.fetch = mockFetch(500);
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb });

      expect(failCb.mock.calls[0][0].status).toBe(500);
    });

    it('includes status in onError from onStatus handler', async () => {
      const onError = vi.fn();
      fetcherSetup({ onError });
      globalThis.fetch = mockFetch(422, {});

      await Fetcher.go({ url: '/test' }, { onStatus: { 422: vi.fn() } });

      expect(onError.mock.calls[0][0].status).toBe(422);
    });

    it('status is undefined on network error', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('Network error');
      });
      const failCb = vi.fn();

      await Fetcher.go({ url: '/test' }, { fail: failCb });

      expect(failCb.mock.calls[0][0].status).toBeUndefined();
    });
  });
});
