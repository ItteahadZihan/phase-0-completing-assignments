# Contributing

Keep launchpad changes small, typed, and covered by focused tests.

Before opening a pull request:

```bash
npm test
npm run build
```

Do not add behavior intended to bypass third-party launchpad fees or hide fees
from token creators. Creation fees, authority settings, and signing requirements
should remain explicit in API responses and UI flows.
