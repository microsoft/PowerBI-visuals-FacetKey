# Modernization checkpoint — 2026-10-01

This is a **local, unpublished maintenance update**, not a return to active
maintenance. GitHub remains archived. This work is on the local maintenance
branch and has not been pushed.
Recheck the README notice date against the actual date of any future merge.

The local `legacy` tag preserves the original commit
`f36fa0086b4f07c1e9ef470939ca40a668f5b658`. Its GitHub link will resolve only after
the tag is published with authorization.

## Official pbiviz workflow

The project uses **powerbi-visuals-tools 7.2.1**, the latest published version
checked during this update:

- `npm start` uses `pbiviz start --all-locales`, alongside Sass/template watchers.
- `npm run package` runs project lint/type checks and asset preparation, then
  `pbiviz package --all-locales`.
- pbiviz owns TypeScript/webpack compilation, plugin registration, development
  TLS/server handling, packaging, compression and bundle-statistics output.
- `bin/compileStyles.js` only prepares Sass → CSS and SVG → 20×20 PNG inputs.
  Both generated files are git-ignored.
- Template compilation is shared with the vendored component, rather than
  duplicated in `bin/`. Browser code imports only the Handlebars runtime.
- The custom package writer, plugin loader, dev server and OSS-report pipeline
  have been removed. The former CSV report is no longer generated; source
  license files remain and pbiviz supplies its normal statistics report.
- `webpack.config.js` now configures browser unit tests only.

The standard output is:

```text
dist/FacetKey1642434105454.1.1.5.0.pbiviz
```

The preview uses this exact official filename, with no fallback to the old custom
artifact. Its host namespace is initialized before pbiviz's plugin executes.

### Configuration details and limitations

`--all-locales` is a supported CLI option. It preserves locales and avoids the
7.2.1 locale-pruning loader's inability to evaluate the current formatting
library's ESM output. API checking and minification are **not** disabled.
The CLI normalizes the packaged API patch version (SDK 5.11.1 → API 5.11.0).

pbiviz's shipped development configuration defaults to unrestricted hosts and
wildcard CORS. The small `pbiviz.mjs` project configuration adjusts that shipped
webpack server configuration to retain loopback binding, strict Host/Origin
checks and real-path containment. It does not replace the compiler/server or
modify installed dependency files. This configuration is coupled to the shipped
7.2.1 webpack configuration and is tested against the actual CLI. `--drop` is
rejected because it would overwrite the guard in this version; normal start
already writes generated assets.

Native CLI packaging can generate development certificate files. Packaging and
dev-server checks used isolated HOME directories; no OS certificate trust was
changed. Browser tests ran with the normal HOME because Chrome did not capture
when given the isolated build HOME.

The CLI reports recommendations for features such as context menus, high contrast,
keyboard navigation, rendering events, tooltips, localization and sync slicers.
These recommendations were not suppressed or treated as implemented. This is
not a claim of Power BI certification or complete host compatibility.

## Visual and dependency modernization

- Public Power BI Visuals API 5.11.1, preserving GUID `FacetKey1642434105454`.
- Public selection IDs, JSON range filters, bookmark callbacks, persistence,
  pagination and formatting models replace private host services/query internals.
- Current compatible Power BI utilities, jQuery, Chai, Sinon, ESLint and TypeScript.
- npm remains the package manager; root and vendor npm v3 lockfiles are preserved.
- The component is an explicit npm `file:` dependency. Custom download/install/
  symlink wrappers, obsolete TSLint/publishing config, JSPM metadata and old API
  aliases have been removed.
- Vendor tooling is a working Node/esbuild/Sass build with node:test/jsdom tests
  and V8 coverage, replacing the obsolete Gulp/Browserify/PhantomJS stack.
- DOMPurify sanitizes rich-label HTML, including existing SafeString wrappers.
- Current security lint checks remain active through maintained and local AST rules.

## Security scans and version choices

**Both full dependency audits pass with zero vulnerabilities**, including vendor
development dependencies. Run `npm run audit:all`. No advisory ignores, severity
reductions or manifest exclusions were introduced. Results reflect the advisory
database at validation time, not a guarantee against future findings.

The SockJS `uuid@11.1.1` override remains necessary for pbiviz's dependency tree;
a test verifies the `uuid.v4()` API it actually uses. TypeScript 6.0.3 stays within
the stable typescript-eslint peer range (`<6.1`), and @types/node follows Node 24
LTS. Prerelease versions on `latest` tags are not selected. The original non-strict
TypeScript policy remains explicit; security lint rules are not weakened.

## Independent validation

Validated on Node 24 LTS:

- **81 ChromeHeadless browser tests** and project lint/typecheck.
- **73 current build/security/schema/dependency tests**, none skipped on macOS.
- **22 vendor tests**, including the shared template compiler.
- **2 official package checks**: metadata/resources, API family, executable JS,
  CSS and a 20×20 PNG icon.
- **2 official dev-server checks**: loopback configuration, live HTTPS serving,
  CSS reload, allowed/denied origins, Host checks and symlink/traversal rejection.
- Packaged-visual Chrome preview interactions and screenshots.
- Native production packaging and both full audits.

A fresh temporary source copy without node_modules or generated CSS/icon files
passed installation, the same checks, and native packaging. Packaging alone used
an isolated HOME; Chrome tests used the normal environment. Generated artifacts,
certificates and caches are not intended for commit. Sass and upstream Node
runtime deprecation warnings remain non-blocking.

## Local preview and remaining Power BI validation

`npm run preview` builds and serves the official package at
`http://127.0.0.1:8090` with sample data and a mock host. `npm run test:preview`
uses installed Chrome and writes screenshots to `.tmp/preview/`.

The user will validate in Power BI separately: bound data roles, selection and
cross-filtering, numeric/date ranges, existing/new bookmarks, pagination,
search/more/less, formatting, theme/layout and sandbox behavior. Mock-host tests
cannot establish those real-host contracts. The visual remains unsupported.

Publication still requires diff/host review, a confirmed notice date, explicit
unarchive authorization, the normal approving PR review, default-branch security
verification and re-archiving. No repository settings have been changed.
