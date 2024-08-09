import { useCallback } from 'react';
import Fetcher, { FetcherOptions } from './fetcher';
import { FetcherObject } from './fetcherObject';

export default function useFetcher<TSuccess, TError400, TBody, TUrlParams>(
  fetcherObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
) {
  return useCallback(
    (options?: FetcherOptions<TSuccess, TError400, TBody, TUrlParams>) => {
      return Fetcher.go(fetcherObject, options);
    },
    [fetcherObject],
  );
}
