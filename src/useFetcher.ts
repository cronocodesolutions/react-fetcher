import { useCallback } from 'react';
import Fetcher, { FetcherOptions } from './fetcher';
import { FetcherObject } from './fetcherObject';

export default function useFetcher<TSuccess, TBody, TUrlParams>(fetcherObject: FetcherObject<TSuccess, TBody, TUrlParams>) {
  return useCallback(
    (options: FetcherOptions<TSuccess, TBody, TUrlParams>) => {
      return Fetcher.go(fetcherObject, options);
    },
    [fetcherObject],
  );
}
