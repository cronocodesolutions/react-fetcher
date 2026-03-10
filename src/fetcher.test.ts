import { describe, expect, it, vi } from 'vitest';
import Fetcher from './fetcher';
import { fetcherSetup } from '.';

describe('fetcher', () => {
  //
  it('returns status ok', async () => {
    const [success] = await Fetcher.go({
      url: 'https://box.cronocode.com/',
      responseType: 'text',
    });

    expect(success).to.contains('!doctype html');
  });

  it('calls global on error', async () => {
    let isErrorCalled = false;

    fetcherSetup({
      onError() {
        isErrorCalled = true;
      },
    });

    const [success, , response] = await Fetcher.go({
      url: 'https://box.cronocode.com/not-found',
      responseType: 'text',
      errorResponseType: 'text',
    });

    expect(success).toBeUndefined();
    expect(response?.ok).toBe(false);
    expect(isErrorCalled).toBe(true);
  });

  it('GET request should not include Content-Type header', async () => {
    const originalFetch = globalThis.fetch;
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = vi.fn(async (url, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({}), { status: 200 });
    });

    try {
      await Fetcher.go({ url: '/test', method: 'GET' });
      expect(capturedHeaders).toBeDefined();
      expect((capturedHeaders as Record<string, string>)['content-type']).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST request should include Content-Type application/json', async () => {
    const originalFetch = globalThis.fetch;
    let capturedHeaders: HeadersInit | undefined;

    globalThis.fetch = vi.fn(async (url, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({}), { status: 200 });
    });

    try {
      await Fetcher.go({ url: '/test', method: 'POST' });
      expect(capturedHeaders).toBeDefined();
      expect((capturedHeaders as Record<string, string>)['content-type']).toBe('application/json');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
