import { describe, expect, it } from 'vitest';
import Fetcher from './fetcher';
import { fetcherSetup } from '.';

describe('fetcher', () => {
  //
  it('returns status ok', async () => {
    const result = await Fetcher.go({
      url: 'https://box.cronocode.com/',
      responseType: 'text',
    });

    expect(result).to.contains('!DOCTYPE html');
  });

  it('calls global on error', async () => {
    let isErrorCalled = false;

    fetcherSetup({
      onError(data) {
        isErrorCalled = true;
      },
    });

    await expect(() =>
      Fetcher.go({
        url: 'https://box.cronocode.com/not-found',
        responseType: 'text',
        errorResponseType: 'text',
      }),
    ).rejects.toContain('Page not found');

    expect(isErrorCalled).to.be.true;
  });
});
