interface Settings {
  base?: string;
  on401?: () => void;
  getToken?: () => Promise<string | undefined>;
}

namespace FetcherSettings {
  export let settings: Readonly<Settings> = {};

  export function fetcherSetup(fetchSettings: Settings) {
    settings = Object.freeze(fetchSettings);
  }
}

export default FetcherSettings;
