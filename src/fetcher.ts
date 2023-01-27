import { FetcherObject, ResponseType } from './fetcherObject';
import FetcherSettings from './fetcherSettings';

type ErrorResponse = any; //TODO: define error structure

export interface FetcherOptions<TSuccess, TError400, TBody, TUrlParams> {
  urlParams?: TUrlParams;
  body?: TBody;
  success?: (result: TSuccess) => void;
  fail400?: (result: TError400) => void;
  fail?: (result: ErrorResponse) => void;
  always?: () => void;
}

namespace Fetcher {
  export async function go<TSuccess, TError400, TBody, TUrlParams>(
    fetchObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
    options: FetcherOptions<TSuccess, TError400, TBody, TUrlParams>,
  ): Promise<TSuccess> {
    const { url, urlType, method, responseType } = fetchObject || {};
    const { success, fail, fail400, always, urlParams } = options || {};
    const { base, on401 } = FetcherSettings.settings;

    let resourceUrl = typeof url === 'function' ? url(urlParams!) : url;
    resourceUrl = base && urlType !== 'absolute' ? base + resourceUrl : resourceUrl;

    const headers = await prepareHeaders(fetchObject);
    const body = prepareBody(fetchObject, options);

    try {
      const response = await fetch(resourceUrl, {
        method,
        headers,
        body,
      });

      const { status } = response;
      if (status >= 200 && status < 300) {
        const result: TSuccess = await readSuccessResponseData(response, responseType);

        success?.(result);
        always?.();

        return result;
      }

      if (status === 401 && on401) {
        await on401();
      }

      if (status === 400) {
        const json: TError400 = await response.json();

        fail400?.(json);
      }

      throw response;
    } catch (error) {
      fail?.(error);
      always?.();

      throw error;
    }
  }

  async function prepareHeaders<TSuccess, TError400, TBody, TUrlParams>(
    fetchObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
  ) {
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

  function prepareBody<TSuccess, TError400, TBody, TUrlParams>(
    fetchObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
    options: FetcherOptions<TSuccess, TError400, TBody, TUrlParams>,
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

  async function readSuccessResponseData(response: Response, responseType?: ResponseType) {
    switch (responseType) {
      case 'blob':
        return await response.blob();
      default:
        return await response.json();
    }
  }
}

export default Fetcher;
