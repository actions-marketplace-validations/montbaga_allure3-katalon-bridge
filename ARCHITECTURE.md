# Architecture

This document explains how the Allure 3 bridge is put together, and why
the parts that differ from the Allure 2 bridge differ. If you have read
`ARCHITECTURE.md` in `allure-katalon-bridge`, most of the Katalon-side
machinery here is the same code and the same reasoning; this document
concentrates on what Allure 3 changed and what that forced.

## The short version

Allure 3 changed the *generator*, not the *results format*. So the split
is clean:

| Layer | Status under Allure 3 |
|---|---|
| Katalon listener, lifecycle, cross-process locking, log parsing | unchanged |
| Writing `*-result.json` via `allure-java-commons` | unchanged |
| Test identity (`historyId`, `testCaseId`, parameters) | **rewritten - see below** |
| Invoking the CLI, history, config | **rewritten** |

Allure 3 ships a built-in `allure2` reader (`@allurereport/reader/dist/allure2`)
that recognises `*-result.json`, `*-container.json`, `*-attachment*`,
`categories.json`, `environment.properties` and `executor.json`. Everything
the Java side already wrote keeps working, verified against real Katalon
output. There is no `allure-java` 3.x, so the two shipped jars stay at
2.35.4 and the Jackson-shading workaround they exist for is still the
reason only those two jars ship.

## Test identity: the part that matters most

This is the one place where porting the Allure 2 bridge unchanged
produces a **silently wrong report** rather than a degraded one.

### What Allure 2 did

Allure 2 honoured whatever `historyId` a result declared. The Allure 2
bridge used that: it hashed the suite name and an occurrence discriminator
into `historyId` itself, so the same reusable Katalon test case run from
two different suites stayed two distinct tests.

### What Allure 3 does

Allure 3 ignores a declared `historyId` and recomputes its own
(`@allurereport/core/dist/store/convert.js`):

```js
calculateTestId:    ALLURE_ID label  →  raw.testId  →  raw.fullName
calculateHistoryId: `${testCase.id}.${md5(parameters)}`
```

and the allure2 reader maps `testId ← result.testCaseId`. Retry grouping
is then (`store.js`):

```js
retryHash = md5(`${testCaseId}:${parametersHash}:${environmentId}`)
```

Only the newest attempt in a retry group is displayed.

Two consequences follow, and neither is obvious:

1. **`fullName` is never consulted while `testCaseId` is set.** The
   precedence list stops at `testId`. Rewriting `fullName` to
   disambiguate does nothing.
2. **Katalon reuses one test case across many suites under a single
   `testCaseId`.** So every one of those runs hashes into a single retry
   group, and all but the last disappear.

Measured on a real six-result Katalon run containing one genuine failure,
the Allure 2 bridge's output read by Allure 3 gives:

```
overall status: passed | stats: {"total":2,"retries":2,"passed":2}
```

Six executions collapsed to two, and a failing build reported green.

### What this bridge writes instead

Three fields, each doing a distinct job:

- **`Suite` parameter** (`startTestCase`) - feeds `parametersHash`, so the
  same test case run from two different suites is two tests.
- **`browser` label** (`finishTestCase`) - what the generated
  `allurerc.mjs` environments matcher keys on, so the same test case run
  against two browsers is two tests.
- **`Browser` parameter** (`finishTestCase`) - not redundant with the
  label. See below.

`historyId` is still written, because the allure2 reader carries it
through and it costs nothing to keep correct.

Same run, same results, with these three fields:

```
overall: failed | stats: {"total":6,"passed":5,"failed":1}
```

### Why the browser needs to be both a label and a parameter

An environment separates tests in the report body. It does **not**
separate them in history, because `calculateHistoryId` is
`testCase.id + hash(parameters)` with no environment component.

With the browser as a label only, the Chrome and Firefox runs of one
suite and test case share a single history entry. The newest run
overwrites the other, so a browser-specific failure vanishes from Trend -
and the pass/fail pair makes Allure flag the test **flaky** when nothing
was flaky at all. Measured: 5 history entries for 6 tests, and the entry
for the failing Chrome run recorded as `passed`.

Adding the browser to the parameters gives each browser its own history
line: 6 entries for 6 tests, failure preserved, no spurious flaky flag.

The suite label also no longer carries a `(Browser)` suffix. That was an
Allure 2 workaround for having nowhere better to put the browser; an
environments matcher keys on a label rather than a suffix it would have
to parse back out of a display name.

## Invoking the CLI

Allure 2's CLI was a Java launcher that had to be found on `PATH`. The
Allure 2 bridge carried a whole resolution ladder for it - configured
path, common install locations per OS, then asking the user's login shell
- because a Katalon Studio IDE launched from Finder/Dock/Start Menu never
sources the profile scripts that volta/nvm/sdkman/homebrew rely on, so
`allure` was invisible to it even when `which allure` worked in a
terminal.

Allure 3 is a Node program, and this bridge pins it as its own npm
dependency. The installer resolves the exact CLI entry point once and
records it, with the node binary it resolved, in
`.allure3-bridge/cli.json`. The Groovy side then runs
`[node, cli.js, ...]` directly.

That deletes the entire problem class:

- no `PATH` dependence, so the GUI-launch failure mode cannot occur;
- no `cmd /c` wrapper, because there is no `.cmd` shim involved - Java's
  `ProcessBuilder` cannot launch one directly, which is why the Allure 2
  bridge needed the wrapper on Windows;
- no version drift between what the bridge expects and what is installed.

Resolution order, for the cases where the record is missing or stale
(a project committed to git and checked out elsewhere, say):
configured path → `.allure3-bridge/cli.json` → a copy vendored into the
project by `--vendor-cli` → the project's own `node_modules` → a bare
`allure` on `PATH` for CI images that already provide one.

Two details worth knowing, both found the hard way:

- The CLI entry point is **`allure/cli.js`**, at the package root, not
  `allure/dist/cli.js` as the rest of the layout suggests.
- `require.resolve` cannot find it. The package declares an `exports` map
  listing only `.`, `./rules` and `./qualityGate`, so Node refuses every
  other subpath, `./package.json` included. The installer walks
  `node_modules` directories upward instead, which also handles npm
  hoisting the dependency above this package.

## Command line differences

- **`--single-file` moved** off `generate` and onto the report plugin, so
  single-file mode runs `allure awesome --single-file`. Multi-file mode
  uses plain `generate`, whose default plugin is awesome anyway, so both
  modes produce the same report and only the packaging differs.
- **`--clean` is gone.** Nothing needs it here: every run generates into
  its own uniquely-named staging directory, and the atomic swap into
  place is what publishes it.
- **`--history-path` is only on the plugin commands.** `generate` reads
  `historyPath` from the config file, which is why the installer writes
  one.

## History

Allure 2 stored history as a `history/` folder inside the generated
report, which had to be copied back into the results directory before the
next generation. The Allure 2 bridge did exactly that - and documented
that it could not work in single-file mode, since there is no report
folder to read history back out of when everything is embedded in one
`.html`.

Allure 3 keeps history in a single external JSONL file, appended on each
generation. Because it lives outside the report, **single-file reports
now carry Trend and Retries forward**. The Allure 2 bridge's
`carryHistoryForward()` is deleted rather than ported; its entire reason
for existing is gone.

## Configuration

The Katalon-facing configuration stays a properties file
(`Include/config/allure3/allure3.properties`), with every key overridable
by an `ALLURE3_*` environment variable, exactly as before.

Allure 3 adds its own config file, which the installer generates at the
project root as `allurerc.mjs`. It holds what the properties file cannot
express - environments, and optionally categories and a quality gate -
and anything it declares wins over the flags the bridge passes.

The generated config deliberately does **not**
`import { defineConfig } from "allure"`. Allure 3 is pinned inside the
bridge's package, not installed into the Katalon project, so that import
fails with `Cannot find package 'allure'`. `defineConfig` is an identity
function used only for TypeScript typing, so exporting the object
directly is equivalent and resolves from any directory.

One constraint worth knowing: Allure 3 restricts environment ids to
latin letters, digits, underscores and hyphens, and rejects anything else
outright. `Edge Chromium` is therefore keyed as `Edge_Chromium`, with the
original spelling kept as the display variable.

## What is unchanged from the Allure 2 bridge

Everything below is the same code and the same reasoning, and the
`allure-katalon-bridge` ARCHITECTURE.md explains each in full:

- Katalon's `Test Listeners/` auto-discovery as the only integration
  surface - no plugin, no OSGi bundle, no build step.
- Cross-phase state in files under the results directory, because
  Katalon's lifecycle phases do not reliably share static fields and a
  Test Suite Collection can run members in separate OS processes.
- `withRunLock()` combining a `synchronized` block with a real
  `FileLock`, since a second `FileLock` from another thread in the same
  JVM throws rather than blocking.
- Deciding when a run is finished via `plan.jsonl`, with a
  one-directional fallback that can only over-generate, never skip.
- Recovering a Test Suite Collection's name from the run's folder
  structure, since no public API exposes it to a listener.
- Deferring step parsing to `AfterTestSuite`, because Katalon holds a
  test case's log open until every `AfterTestCase` listener has returned.
- Every public entry point catching `Throwable` and only logging: a bug
  in report generation must never change the outcome of the real test.

## Coexistence during migration

The Groovy package is `allure3`, the keywords live in `Keywords/allure3/`,
the listener is `Allure3TestListener`, the config is
`Include/config/allure3/`, and the cross-phase state files are
`.allure3-*`. Nothing collides with an existing Allure 2 bridge install,
so both can sit in one project while you migrate.

They should not both be *enabled*, though: two listeners both writing
every test case into the same results directory produces duplicates.
Remove one listener, or set `allure.enabled=false` / `allure3.enabled=false`
on whichever you are not using.
