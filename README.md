> **This repository is the result of research efforts that are no longer active. It has been marked read-only on GitHub to preserve the public code, but is no longer maintained or accepting contributions.**

> **This repo has been updated while in archived state on 2026-10-01 to maintain dependency security. This update has not been thoroughly tested and there is no expectation that the code will work out of the box, only that it is compliant with our security scans.**

The [`legacy` tag](https://github.com/microsoft/PowerBI-visuals-FacetKey/tree/legacy) preserves the historical implementation before this update.

See [the maintenance checkpoint](MAINTENANCE.md) for validation results and
compatible-version choices. This local draft uses the public Power BI Visuals
API 5.11.1 and is awaiting manual Power BI validation; it has not been published.

# Facet Key Power BI Custom Visual
![Alt text](assets/screenshot.png?raw=true "Facet Key")

## Requirements and Installation

Use Node.js 24 LTS and npm. Browser tests require Google Chrome or Chromium;
set `CHROME_BIN` if it is not installed in the default location.

Install the locked dependencies without running package lifecycle scripts:

```sh
npm ci --ignore-scripts
```

The Facets component source is vendored under
`lib/@uncharted.software/stories-facets` and registered as an npm `file:` dependency.
The historical custom download and scope-wide symlink installation workflow is no
longer used.

To install the separate component's development tools and run every local check:

```sh
npm run vendor:install
npm run validate
```

## Local Browser Preview

```sh
npm run preview
```

Open **http://127.0.0.1:8090**. This builds and serves the actual `.pbiviz` JavaScript
and CSS with synthetic data and a mock Power BI host. Try the basic, range,
segmented and sparkline scenarios; selection, search, more/less, bookmarks,
formatting options and canvas resizing are interactive.

The host event log and cross-filter summary are simulations. This preview is useful
for styling and local behavior, but does not validate Power BI's real data,
bookmark or cross-filter pipelines. No Power BI sign-in or certificate trust step
is needed for this HTTP preview. pbiviz may generate its development certificate
cache while building. Stop with Ctrl-C; set `FACETKEY_PREVIEW_PORT` to use another port.
Rebuild/restart the preview after editing source files.

`npm run test:preview` exercises the packaged visual in headless Chrome and writes
screenshots under `.tmp/preview/` (requires an existing package).

## Debugging

1. Run `npm run install-certificate` to generate a development certificate locally,
   then trust that certificate on your development machine.
2. Enable developer mode using Microsoft's
   [environment setup guide](https://learn.microsoft.com/en-us/power-bi/developer/visuals/environment-setup).
3. Run `npm start`. This uses **`pbiviz start --all-locales`**, with the official
   TypeScript/CSS watcher and development server at `https://127.0.0.1:8080`.
   Sass and template compilation run alongside it.

pbiviz manages development certificates in `~/pbiviz-certs/`; no shared private
key is included. `pbiviz.mjs` narrowly hardens the shipped server's Host, Origin
and filesystem-boundary checks. It does not replace its compiler or server.
The `--drop` flag is rejected because this pbiviz version would overwrite that
middleware; ordinary `pbiviz start` already writes its generated assets to disk.

Use `npm run styles` after editing the SVG icon. The generated PNG and CSS are
ignored by git. `webpack.config.js` is only for browser unit tests, not the
production/development visual build.

## Building

* Run `npm run package`: project lint/type checks and asset preparation, followed
  by **`pbiviz package --all-locales`**.
* Import `dist/FacetKey1642434105454.1.1.5.0.pbiviz` into Power BI.
* pbiviz generates its own bundle-statistics report; there is no custom package
  writer or plugin loader.

`--all-locales` preserves locale support and avoids the current CLI locale-pruning
loader's incompatibility with the formatting library's ESM output. API verification
and production minification remain enabled. pbiviz normalizes the packaged API
version to the installed SDK's major/minor family.

## Testing

- `npm test`: browser unit tests in headless Chrome.
- `npm run test:tdd`: interactive browser tests.
- `npm run test:security`: build, security-lint, manifest-schema and dependency regression tests.
- `npm run vendor:test`: standalone component build and DOM tests.
- `npm run test:build`: validate the official `.pbiviz` metadata, resources and icon.
- `npm run test:dev`: exercise native pbiviz serving, CSS watching and request protections.
- `npm run typecheck`: TypeScript checks.
- `npm run lint`: source lint checks.
- `npm run audit:all`: full root and vendored dependency scans, including development tools.
- `npm run validate`: all of the above checks plus packaging.

These checks do not establish compatibility with the current Power BI host.
The visual remains unsupported; verify it in Power BI before use.