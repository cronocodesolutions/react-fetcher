interface Settings {
  base?: string;
  on401?: () => Promise<void>;
  getToken?: () => Promise<string | undefined>;
  headers?: Record<string, string>;
}

namespace FetcherSettings {
  export let settings: Readonly<Settings> = {};

  export function fetcherSetup(fetchSettings: Settings) {
    settings = Object.freeze(fetchSettings);
  }
}

export default FetcherSettings;
