import { FetcherObject } from './fetcherObject';
import FetcherSettings from './fetcherSettings';

type ErrorResponse = any; //TODO: define error structure

export interface FetcherOptions<TSuccess, TBody, TUrlParams> {
  urlParams?: TUrlParams;
  body?: TBody;
  success?: (result: TSuccess) => void;
  fail?: (result: ErrorResponse) => void;
  always?: () => void;
}

namespace Fetcher {
  export async function go<TSuccess, TBody, TUrlParams>(
    fetchObject: FetcherObject<TSuccess, TBody, TUrlParams>,
    options: FetcherOptions<TSuccess, TBody, TUrlParams>,
  ): Promise<TSuccess> {
    const { url, urlType, method, contentType, authorization, responseType } = fetchObject || {};
    const { success, fail, always, urlParams } = options || {};
    const { base, getToken } = FetcherSettings.settings;

    let resourceUrl = typeof url === 'function' ? url(urlParams!) : url;
    resourceUrl = base && urlType !== 'absolute' ? base + resourceUrl : resourceUrl;

    const headers = await prepareHeaders(fetchObject);
    const body = prepareBody(fetchObject, options);

    const response = await fetch(resourceUrl, {
      method,
      headers,
      body,
    }).catch((error) => {
      return error;
    });

    return 1 as any;
  }

  async function prepareHeaders<TSuccess, TBody, TUrlParams>(fetchObject: FetcherObject<TSuccess, TBody, TUrlParams>) {
    const { contentType, authorization } = fetchObject || {};
    const { getToken } = FetcherSettings.settings;

    const headers: Record<string, string> = {};

    if (!contentType || contentType === 'application/json') {
      headers['content-type'] = contentType || 'application/json';
    }

    if (getToken && (!authorization || authorization === 'token')) {
      const token = await getToken();
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function prepareBody<TSuccess, TBody, TUrlParams>(
    fetchObject: FetcherObject<TSuccess, TBody, TUrlParams>,
    options: FetcherOptions<TSuccess, TBody, TUrlParams>,
  ): BodyInit | undefined {
    const { contentType } = fetchObject || {};
    const { body } = options || {};

    if (!body) {
      return undefined;
    }

    if (!contentType || contentType === 'application/json') {
      return JSON.stringify(body) as BodyInit;
    }

    if (contentType === 'multipart/form-data') {
      return Object.entries(body).reduce((fd, [key, value]) => {
        fd.append(key, value as any);

        return fd;
      }, new FormData()) as BodyInit;
    }

    return body as BodyInit;
  }
}

export default Fetcher;
