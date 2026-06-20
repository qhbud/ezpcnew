# Slice 11-P2 Raw Results

## File:line

```text
server.js:1571
test/share-e2e.js:165
test/share-e2e.js:170
```

## Live dependency check

```text
{"express":"4.21.2","constructor":"SyntaxError","syntaxError":true,"type":"entity.parse.failed","status":400,"statusCode":400,"body":"{\"cpu\":"}
```

## node --check server.js

```text
```

```text
Exit code: 0
```

## node --check test/share-e2e.js

```text
```

```text
Exit code: 0
```

## node test/share-e2e.js

```text
PASS server ready started-by-test url=http://localhost:3000
PASS POST /api/builds malformed JSON rejected status=400
PASS POST /api/builds id=lV4yZBxSuiOc
PASS GET /api/builds/:id round-trip
PASS Mongo stored document shape
PASS GET /api/builds/:id missing
PASS POST /api/builds unknown key rejected status=400
PASS POST /api/builds arbitrary nested field rejected status=400
PASS POST /api/builds oversized body rejected status=413
PASS client short-id share/load and legacy base64 branches
```

```text
Exit code: 0
```

## npm test

```text
npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. For 
more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:2 char:1
+ npm test
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess
```

```text
Exit code: 1
```

## npm.cmd test with local server

```text

> pcbuilder2@1.0.0 test
> node test/smoke.js

CONSOLE ERRORS: 0
PAGE ERRORS: 0
```

```text
Exit code: 0
```

STATUS: COMPLETE
