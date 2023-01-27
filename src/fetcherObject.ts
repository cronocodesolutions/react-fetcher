export interface FetcherObject<
  TSuccess = unknown,
  TBody = unknown,
  TUrlParams = unknown
> {
  url: string | ((urlParam: TUrlParams) => string);
  urlType?: "relative" | "absolute";
  method?: "GET" | "POST" | "PUT" | "DELETE";
  contentType?: "application/json" | "multipart/form-data";
  authorization?: "token" | "anonymous";
  responseType?: "json" | "blob";
}
