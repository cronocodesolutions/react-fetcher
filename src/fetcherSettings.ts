export interface FetcherError {
  url: string;
  error: any;
  response?: Response;
  name?: string;
  body?: BodyInit;
}

interface Settings {
  base?: string;
  on401?: () => Promise<void>;
  getToken?: () => Promise<string | undefined>;
  headers?: Record<string, string>;
  onError?: (data: FetcherError) => void;
}

namespace FetcherSettings {
  export let settings: Readonly<Settings> = {};

  export function fetcherSetup(fetchSettings: Settings) {
    settings = Object.freeze(fetchSettings);
  }
}

export default FetcherSettings;
