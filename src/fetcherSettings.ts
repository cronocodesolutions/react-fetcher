export interface FetcherError {
  url: string;
  error: any;
  response?: Response;
  status?: number;
  name?: string;
  body?: BodyInit;
}

interface Settings {
  base?: string;
  getToken?: () => Promise<string | undefined>;
  headers?: () => Record<string, string>;
  onError?: (data: FetcherError) => void;
  on401?: () => void;
  on403?: () => void;
}

namespace FetcherSettings {
  export let settings: Readonly<Settings> = {};

  export function fetcherSetup(fetchSettings: Settings) {
    settings = Object.freeze(fetchSettings);
  }
}

export default FetcherSettings;
