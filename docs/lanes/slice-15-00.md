# Slice 15-00 raw results

## File:line

- `public/index.html:1580` — Export List button
- `public/index.html:2221-2242` — export modal, format tabs, readonly output, Copy button
- `public/styles-v5.css:2107-2197` — export modal, tabs, output, responsive styles
- `public/script.js:7138` — Markdown generator
- `public/script.js:7162` — Plain text generator
- `public/script.js:7180` — BBCode generator
- `public/script.js:429-456` — open/close/tab/copy event wiring
- `public/script.js:6988` — shared clipboard helper
- `public/script.js:7253` — active-format copy wiring and toast feedback
- `test/export-e2e.js:86-287` — live `/api/parts` export gate coverage

## Real assembled build samples

### Markdown

```text
| Slot | Component | Price |
| --- | --- | ---: |
| CPU | [Intel Core i9-13900KF Desktop Processor](https://www.amazon.com/dp/B0BCFM3CJ4?tag=qhezpc-20) | $782.05 |

**Total: $2611.98**
**Estimated wattage: 409W**

As an Amazon Associate EZPC earns from qualifying purchases.
```

### Plain text

```text
CPU          : Intel Core i9-13900KF Desktop Processor — $782.05 — https://www.amazon.com/dp/B0BCFM3CJ4?tag=qhezpc-20

Total        : $2611.98
Estimated wattage: 409W

As an Amazon Associate EZPC earns from qualifying purchases.
```

### BBCode

```text
[b]EZPC Build[/b]
[b]CPU:[/b] [url=https://www.amazon.com/dp/B0BCFM3CJ4?tag=qhezpc-20]Intel Core i9-13900KF Desktop Processor[/url] — $782.05

[b]Total:[/b] $2611.98
[b]Estimated wattage:[/b] 409W

As an Amazon Associate EZPC earns from qualifying purchases.
```

## `node --check public/script.js`

```text
```

Exit code: 0

## `node test/export-e2e.js`

```text
PASS E1 generates all formats from a real assembled build
PASS E2 formats are distinct, escaped, linked, and well formed
PASS E3 copy uses the active format exactly and shows feedback
PASS E4 empty build is guarded and every output includes FTC disclosure
SAMPLE MARKDOWN
| Slot | Component | Price |
| --- | --- | ---: |
| CPU | [Intel Core i9-13900KF Desktop Processor](https://www.amazon.com/dp/B0BCFM3CJ4?tag=qhezpc-20) | $782.05 |

**Total: $2611.98**
**Estimated wattage: 409W**

As an Amazon Associate EZPC earns from qualifying purchases.
SAMPLE PLAIN TEXT
CPU          : Intel Core i9-13900KF Desktop Processor — $782.05 — https://www.amazon.com/dp/B0BCFM3CJ4?tag=qhezpc-20

Total        : $2611.98
Estimated wattage: 409W

As an Amazon Associate EZPC earns from qualifying purchases.
SAMPLE BBCODE
[b]EZPC Build[/b]
[b]CPU:[/b] [url=https://www.amazon.com/dp/B0BCFM3CJ4?tag=qhezpc-20]Intel Core i9-13900KF Desktop Processor[/url] — $782.05

[b]Total:[/b] $2611.98
[b]Estimated wattage:[/b] 409W

As an Amazon Associate EZPC earns from qualifying purchases.
```

Exit code: 0

## `npm test`

```text
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For 
more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:2 char:1
+ npm test
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

Exit code: 1

## `cmd.exe /d /c "npm test"` Windows shim

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

Exit code: 0

STATUS: COMPLETE_WITH_CONCERNS (PowerShell blocked the literal npm.ps1 wrapper; cmd.exe executed the same npm test script successfully)
