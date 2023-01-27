import Fetcher from './fetcher';
import FetcherSettings from './fetcherSettings';
import useFetcher from './useFetcher';

const { fetcherSetup } = FetcherSettings;

export type { FetcherOptions } from './fetcher';
export type { FetcherObject } from './fetcherObject';
export { fetcherSetup, useFetcher };

export default Fetcher;
