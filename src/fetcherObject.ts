export type ResponseType = 'json' | 'blob' | 'empty';

export interface FetcherObject<TSuccess = unknown, TError400 = unknown, TBody = unknown, TUrlParams = unknown> {
  url: string | ((urlParam: TUrlParams) => string);
  urlType?: 'relative' | 'absolute';
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  contentType?: 'application/json' | 'multipart/form-data';
  authorization?: 'token' | 'anonymous';
  responseType?: ResponseType;
}
