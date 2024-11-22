import { FetcherObject, ResponseType } from './fetcherObject';
import FetcherSettings, { FetcherError } from './fetcherSettings';

type ErrorResponse = any; //TODO: define error structure

export interface FetcherOptions<TSuccess, TError400, TBody, TUrlParams> {
  urlParams?: TUrlParams;
  body?: TBody;
  success?: (result: TSuccess) => void;
  fail400?: (result: TError400) => void;
  fail?: (data: FetcherError) => void;
  always?: () => void;
}

namespace Fetcher {
  export async function go<TSuccess, TError400, TBody, TUrlParams>(
    fetcherObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
    options?: FetcherOptions<TSuccess, TError400, TBody, TUrlParams>,
  ): Promise<[TSuccess, undefined, Response] | [undefined, TError400, Response] | [undefined, undefined, Response]> {
    const { url, urlType, method, responseType, errorResponseType, name } = fetcherObject || {};
    const { success, fail, fail400, always, urlParams } = options || {};
    const { base, on401, onError } = FetcherSettings.settings;

    let resourceUrl = typeof url === 'function' ? url(urlParams!) : url;
    resourceUrl = base && urlType === 'absolute' ? resourceUrl : `${base ?? ''}${resourceUrl}`;

    const headers = await prepareHeaders(fetcherObject);
    const body = prepareBody(fetcherObject, options);

    const response: Response = await fetch(resourceUrl, {
      method,
      headers,
      body,
    });

    const { status } = response;

    try {
      if (status >= 200 && status < 300) {
        const result: TSuccess = await readResponseData(response, responseType);

        success?.(result);
        always?.();

        return [result, undefined, response];
      }

      if (status === 400) {
        const result = (await readResponseData(response, errorResponseType)) as TError400;

        fail400?.(result);
        always?.();

        return [undefined, result, response];
      }

      if (status === 401 && on401) {
        await on401();
      }

      throw response;
    } catch (error) {
      fail?.({ url: resourceUrl, error, response, name, body });
      onError?.({ url: resourceUrl, error, response, name, body });
      always?.();

      return [undefined, undefined, response];
    }
  }

  async function prepareHeaders<TSuccess, TError400, TBody, TUrlParams>(
    fetcherObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
  ) {
    const { contentType, authorization = 'token' } = fetcherObject;
    const { getToken, headers: globalHeaders } = FetcherSettings.settings;

    const headers: Record<string, string> = globalHeaders?.() ?? {};

    if (!contentType || contentType === 'application/json') {
      headers['content-type'] = contentType || 'application/json';
    }

    if (getToken && authorization === 'token') {
      const token = await getToken();
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function prepareBody<TSuccess, TError400, TBody, TUrlParams>(
    fetcherObject: FetcherObject<TSuccess, TError400, TBody, TUrlParams>,
    options?: FetcherOptions<TSuccess, TError400, TBody, TUrlParams>,
  ): BodyInit | undefined {
    const { contentType } = fetcherObject;
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

  async function readResponseData(response: Response, responseType?: ResponseType) {
    switch (responseType) {
      case 'blob':
        return await response.blob();
      case 'text':
        return await response.text();
      case 'empty':
        return null;
      default:
        return await response.json();
    }
  }
}

export default Fetcher;
