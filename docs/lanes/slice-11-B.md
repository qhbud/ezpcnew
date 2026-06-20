# Slice 11-B

## Phase 1 evidence

| Item | File:line | Raw evidence |
|---|---|---|
| Static `public/` serving | `server.js:141` | `app.use(express.static(path.join(__dirname, 'public'), {` |
| Root document | `server.js:1478` | `res.sendFile(path.join(__dirname, 'public', 'index.html'));` |
| Shared stylesheet | `public/index.html:31` | `<link rel="stylesheet" href="styles-v5.css?v=mobo-filters-5">` |
| Reused outer shell | `public/index.html:100` | `<div class="container">` |
| Reused site header | `public/index.html:101-106` | `<header>`, `<h1>`, `.header-action-btn`, `#headerDescription` |
| Container width | `public/styles-v5.css:109-113` | `.container { max-width: 1280px; margin: 0 auto; padding: var(--space-4); }` |
| Reused tokens | `public/styles-v5.css:19-26` | `--text-primary`, `--text-secondary`, `--text-muted`, `--brand`, `--brand-hover`, `--brand-light` |
| Reused header rules | `public/styles-v5.css:115-162` | `header`, `header::before`, `header h1`, `header h1 i`, `header p` |

## New files

| File | `<title>` | `<h1>` | Approximate length |
|---|---|---|---:|
| `public/privacy.html` | `Privacy Policy \| EZPC World` | `Privacy Policy` | 3,596 bytes / 361 words |
| `public/terms.html` | `Terms of Use \| EZPC World` | `Terms of Use` | 4,083 bytes / 404 words |
| `public/about.html` | `About EZPC \| EZPC World` | `About EZPC` | 3,467 bytes / 344 words |
| `test/trust-e2e.js` | — | — | 3,599 bytes / 98 lines |
| `docs/lanes/slice-11-B.md` | — | — | approximately 5 KB |

## Affiliate disclosure

| Sentence | Locations |
|---|---|
| `As an Amazon Associate EZPC earns from qualifying purchases.` | `public/index.html:2143`, `public/privacy.html:41`, `public/terms.html:44`, `public/about.html:39` |

## Analytics scaffold

Location: `public/index.html:35-36`

```html
<!-- Analytics placeholder: Quinn must confirm data-domain="ezpc.world" or swap providers before launch. -->
<script defer data-domain="ezpc.world" src="https://plausible.io/js/script.js"></script>
```

| Quinn edit | Value |
|---|---|
| Attribute/provider | Confirm `data-domain="ezpc.world"` or replace the Plausible script before launch |

## `node test/trust-e2e.js`

Command:

```text
$env:BASE_URL='http://localhost:3111'; node test/trust-e2e.js
```

Output:

```text
PASS /privacy.html HTTP 200
PASS /privacy.html body length > 500
PASS /privacy.html title
PASS /privacy.html h1
PASS /privacy.html affiliate disclosure
PASS /terms.html HTTP 200
PASS /terms.html body length > 500
PASS /terms.html title
PASS /terms.html h1
PASS /terms.html affiliate disclosure
PASS /about.html HTTP 200
PASS /about.html body length > 500
PASS /about.html title
PASS /about.html h1
PASS /about.html affiliate disclosure
PASS / HTTP 200
PASS index footer link /privacy.html
PASS index footer link /terms.html
PASS index footer link /about.html
PASS index affiliate disclosure
PASS Plausible analytics script in head
PASS analytics Quinn placeholder comment
PASS no analytics secret or Sentry/GA identifier
RESULTS: 23 passed, 0 failed
```

Exit code: `0`

## `npm test`

PowerShell command:

```text
$env:BASE_URL='http://localhost:3111'; npm test
```

PowerShell output:

```text
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For 
more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:2 char:40
+ $env:BASE_URL='http://localhost:3111'; npm test
+                                        ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

PowerShell exit code: `1`

Equivalent executable command:

```text
$env:BASE_URL='http://localhost:3111'; npm.cmd test
```

Output:

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: `0`

STATUS: COMPLETE
