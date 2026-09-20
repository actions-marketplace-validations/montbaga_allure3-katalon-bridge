# Allure3-Katalon Bridge

[![npm version](https://img.shields.io/npm/v/allure3-katalon-bridge.svg)](https://www.npmjs.com/package/allure3-katalon-bridge)
[![CI](https://img.shields.io/github/actions/workflow/status/montbaga/allure3-katalon-bridge/ci.yml?branch=main&label=CI)](https://github.com/montbaga/allure3-katalon-bridge/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/npm/l/allure3-katalon-bridge.svg)](LICENSE.md)
[![Last commit](https://img.shields.io/github/last-commit/montbaga/allure3-katalon-bridge.svg)](https://github.com/montbaga/allure3-katalon-bridge/commits/main)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-red)](https://github.com/sponsors/montbaga)

Turn any Katalon Studio project into an [Allure 3](https://allurereport.org/docs/v3/)
reporting project by double-clicking one file. No plugin installation, no
OSGi packaging, no changes to existing Test Cases or Test Suites, and no
global Allure install, because the Allure 3 CLI ships pinned inside this
package.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for how this is actually built
under the hood, and why the Allure 3 parts work the way they do.

## See It in Action

**1. Install with one command**

![Install with npx](demo/images/npx_1st_step.jpg)

**2. Run your test suite or collection like you always do**

![Run a test suite](demo/images/run_test_suite_or_collection_2nd_Step.jpg)

**3. The Allure 3 report is generated automatically, right inside Katalon Studio**

![Report generated in Katalon Studio](demo/images/allure_report_3rd_Step.jpg)

**4. Open it and get the full picture - suites, steps, charts, environments, everything**

![Allure 3 report opened in browser](demo/images/laststep_reports_1.jpg)

**Results group by environment, so one test case run from several suites and browsers stays several tests instead of collapsing into one**

![Results grouped by environment and suite](demo/images/laststep_reports_2nd.jpg)

**Charts come with the report, in that same single file**

![Current status, status dynamics, severities, status transitions](demo/images/laststep_graphs_1.jpg)

![Test base growth, coverage diff, success rate, problems by environment](demo/images/laststep_graphs_2.jpg)

![Stability by feature, epic and story, durations histogram](demo/images/laststep_graphs_3.jpg)

![Durations by layer, duration dynamics, status age pyramid, testing pyramid](demo/images/laststep_graphs_4.jpg)

**Each test case keeps its own steps, parameters and history**

![A passing test case in detail](demo/images/PassedTesCaseDetailed.jpg)

**A failure shows the step that broke, the stack trace, and a screenshot captured for you**

![Failed test case, overview and parameters](demo/images/FailedTestCaseDetailed_1.jpg)

![Failed test case, the failing step and its stack trace](demo/images/FailedTestCaseDetailed_2.jpg)

![Failed test case, the screenshot captured on failure](demo/images/FailedTestCaseDetailed_3.jpg)

## Verified in CI

The same Test Suite Collection runs on Azure Pipelines hosted agents for
Windows, macOS and Linux, producing one self-contained Allure 3 report per
run as a downloadable artifact. Ready-to-copy configs for all three
platforms are in [CI setup](#ci-setup) below.

Linux needs two steps the other two do not, both included in the example
config: Xvfb, because Katalon Studio is an Eclipse application and needs a
display even when the browser runs headless, and JDK 21, because Katalon
11.x's OSGi bundles require it and the Ubuntu image does not default to it.

### Windows

![Azure Pipelines run on a Windows agent](demo/images/windows_ci_ado.jpg)

![Allure 3 report from the Windows run](demo/images/windows_ci_ado_allure3_report.jpg)

![Artifacts published by the Windows run](demo/images/windows_ci_ado_artifacts.jpg)

### macOS

![Azure Pipelines run on a macOS agent](demo/images/macos_ci_ado.jpg)

![Allure 3 report from the macOS run](demo/images/macos_ci_ado_allure3_reports.jpg)

![Artifacts published by the macOS run](demo/images/macos_ci_ado_artifacts.jpg)

### Linux

![Azure Pipelines run on an Ubuntu agent](demo/images/ubunti_ci_ado.jpg)

![Allure 3 report from the Ubuntu run](demo/images/ubunti_ci_allure3_report.jpg)

![Artifacts published by the Ubuntu run](demo/images/ubunti_ci_artifacts.jpg)

The report header picks up the build it came from with nothing configured:
`executor.json` reads Azure Pipelines' own environment variables, so the
run links straight back to the pipeline. The browser becomes a
first-class Allure 3 environment, headless included, which is what keeps
the same test case run against different browsers from collapsing into a
single history entry.

## Sponsors

<!-- Company logos go here as Priority Partner / Company sponsors join -->

If your team relies on this in CI, consider
[sponsoring the project](https://github.com/sponsors/montbaga) to support
ongoing maintenance:

| Tier | Price | Gets you |
|---|---|---|
| Coffee | $5/mo | Your name added to the Backers list below |
| Backer | $15/mo | Everything above, plus priority attention on your issues |
| Company | $100/mo | Your company's logo and site link here, near the top of the README |
| Priority Partner | $199/mo | Everything above, plus direct email help wiring the bridge into your CI setup |

## Backers

<!-- Names go here as backers join -->

Thanks to everyone supporting this project.

## Install / Uninstall

One command that works the same everywhere is below under npm. Prefer to
click something? Open the folder matching your OS: it contains only what
you need, nothing from the other platforms. Each section is
self-contained, covering the quick double-click way and the scripted/CI
way with the same flags.

Needs **Node.js 18+** on every platform. That is not an extra hoop the way
it would have been for Allure 2: Allure 3's CLI *is* a Node program, and it
ships pinned inside this package, which is what removes the PATH hunting
the old bridge needed. Installing the package brings the CLI with it, so
the Katalon project never needs Node packages of its own.

<details>
<summary><b>📦 npm (any OS)</b></summary>

Works identically on Windows, macOS and Linux. Useful for CI, or if you'd
rather not pick an OS-specific script.

```
npx allure3-katalon-bridge install "/path/to/your/katalon/project"      # add --force to also overwrite a customized allure3.properties/allurerc.mjs
npx allure3-katalon-bridge uninstall "/path/to/your/katalon/project"    # add --remove-config to also delete allure3.properties/categories.json/allurerc.mjs
```

`npx` fetches and runs it without installing anything globally. To install
it once and reuse it: `npm install -g allure3-katalon-bridge`, then run
`allure3-katalon-bridge install ...` directly.

One caveat specific to `npx`: it unpacks into a transient cache, and the
installer records the path of the Allure 3 CLI it found there. `npm cache
clean`, or npm's own cache eviction, can remove it and leave the project
pointing at a CLI that is gone. Pass `--vendor-cli` to copy the CLI into
the project instead, or install the package properly with `npm i -g`
rather than running it through `npx`.

Also note that `npx <tarball> install <path>` silently does nothing; the
working form for a local tarball is
`npx --package <tarball> -- allure3-katalon-bridge install <path>`.
</details>

<details>
<summary><b>🪟 Windows/</b></summary>

**Just click:** double-click **`Windows\Install.bat`**, then pick your
Katalon project folder in the dialog that opens. Uninstall the same way
with **`Windows\Uninstall.bat`**.

**Drag-and-drop:** drop your project folder onto `Install.bat` (or
`Uninstall.bat`) to skip the dialog entirely.

**Scripted / CI** (run from the repo root):
```powershell
.\Windows\install.ps1 -ProjectPath "C:\path\to\your\katalon\project"      # add -Force to also overwrite a customized allure3.properties/allurerc.mjs, -VendorCli to copy the CLI into the project
.\Windows\uninstall.ps1 -ProjectPath "C:\path\to\your\katalon\project"    # add -RemoveConfig to also delete allure3.properties/categories.json/allurerc.mjs
```
</details>

<details>
<summary><b>🍎 macOS/</b></summary>

**Just click:** double-click **`macOS/Install.command`**, then pick your
Katalon project folder in the dialog that opens. Uninstall the same way
with **`macOS/Uninstall.command`**.

**Scripted / CI** (run from the repo root). macOS shares the Linux bash
engine below, since bash itself is identical on both:
```bash
./Linux/install.sh /path/to/your/katalon/project      # add --force to also overwrite a customized allure3.properties/allurerc.mjs, --vendor-cli to copy the CLI into the project
./Linux/uninstall.sh /path/to/your/katalon/project    # add --remove-config to also delete allure3.properties/categories.json/allurerc.mjs
```
</details>

<details>
<summary><b>🐧 Linux/</b></summary>

Run from the repo root:
```bash
./Linux/install.sh /path/to/your/katalon/project      # add --force to also overwrite a customized allure3.properties/allurerc.mjs, --vendor-cli to copy the CLI into the project
./Linux/uninstall.sh /path/to/your/katalon/project    # add --remove-config to also delete allure3.properties/categories.json/allurerc.mjs
```
Run either script with no path argument and it'll prompt you to paste one instead.
</details>

<details>
<summary><b>🧑‍💻 From a clone (any OS)</b></summary>

The OS folders above are wrappers around one installer, `bin/cli.js`. Call
it yourself if you are working from a clone rather than the npm package:

```
node "<path-to-this-folder>/bin/cli.js" install   "/path/to/your/katalon/project"
node "<path-to-this-folder>/bin/cli.js" uninstall "/path/to/your/katalon/project"
```

One-time setup first, so the bundled Allure 3 CLI is present (the OS
wrappers do this step for you):

```
cd <path-to-this-folder> && npm install
```
</details>


| Flag | PowerShell | Effect |
|---|---|---|
| `--force` | `-Force` | also overwrite a customized `allure3.properties` / `allurerc.mjs` |
| `--vendor-cli` | `-VendorCli` | copy the Allure 3 CLI into the project, so it runs on a machine that never ran the installer |
| `--remove-config` | `-RemoveConfig` | (uninstall) also delete `allure3.properties`, `categories.json`, `allurerc.mjs` |

Uninstalling only removes what the install recorded in
`<project>/.allure3-bridge/manifest.txt`, and keeps your config plus any
generated `allure-results/`, `allure-report/` and `allure-history.jsonl`
unless you pass the flag above.

## Why this exists

Katalon Studio has no first-party Allure adapter, and Allure 3 adds a
problem of its own that a DIY setup will not see coming. This package
solves both sets:

| Problem | How this solves it |
|---|---|
| No hook to drive Allure's lifecycle from Katalon | Uses Katalon's public, documented Test Listener API (`@BeforeTestSuite`/`@BeforeTestCase`/`@AfterTestCase`/`@AfterTestSuite`) |
| Allure's transitive Jackson clashes with Katalon's bundled Jackson | Ships only `allure-java-commons` + `allure-model`, whose Jackson is shaded/relocated internally, verified by inspecting the jar rather than assumed |
| Allure 3 silently merges distinct runs and hides failures | Writes a `Suite` parameter, a `browser` label and a `Browser` parameter so each execution keeps its own identity. See the next section |
| Allure 3's CLI is a Node program that a GUI-launched IDE cannot find on PATH | The CLI is pinned as this package's own dependency and its absolute path recorded at install time, so nothing is ever looked up on PATH |
| Results land in a different folder depending on how the suite was launched | Results directory is resolved explicitly against the project root, not the process's working directory |
| A reporting bug could fail or change the outcome of a real test | Every hook catches its own exceptions and only logs a warning |
| Can't afford to touch thousands of existing test cases | Fully automatic at the suite/case level; step-level detail is opt-in |

## Why Allure 3, and why this is not a drop-in swap

Allure 3 reads Allure 2's results format natively, so it is tempting to
just point `allure` 3.x at an existing Allure 2 bridge's output. Do not.
It produces a **silently wrong report**.

Allure 3 ignores the `historyId` a result declares and recomputes its
own, grouping retries by `md5(testCaseId : parametersHash : environmentId)`
and showing only the newest attempt in each group. Katalon reuses one
test case across many suites under a single `testCaseId`, so those runs
all collapse together.

On a real six-result Katalon run containing one genuine failure:

| | tests shown | reported status |
|---|---|---|
| Allure 2 bridge output, read by Allure 3 | 2 (4 hidden as retries) | **passed** |
| This bridge | 6 | **failed** |

The failing run was hidden behind a passing one. This bridge keeps each
execution distinct in the report body *and* in history.
[`ARCHITECTURE.md`](ARCHITECTURE.md#test-identity-the-part-that-matters-most)
has the full mechanism.

## Requirements

- Katalon Studio (tested on 11.4.0; uses only long-stable public APIs)
- Node.js 18 or newer. Allure 3's CLI is a Node program, so this is not optional. You do **not** need a global Allure install: the CLI is pinned inside this package and its exact path is recorded at install time
- Windows or macOS to use the double-click installer as-is; Linux works via `Linux/install.sh` in a terminal (PowerShell and bash ship with the OS either way, so there is nothing extra to install for the installer itself)

## What the installer actually does

1. Verifies the target folder is a real Katalon project (looks for a `*.prj` file) before writing anything, and refuses to run otherwise.
2. Unpacks the pinned Allure 3 CLI on first use, with a one-time `npm install` inside this package.
3. Copies the Test Listener, Keywords, config, and Drivers jars into the project.
4. Records which Allure 3 CLI and which node binary to run in `<project>/.allure3-bridge/cli.json`, so nothing is ever resolved from PATH at test time.
5. Generates `allurerc.mjs` at the project root, with an Allure 3 environment matcher per browser.
6. Leaves an existing, customized `allure3.properties` or `allurerc.mjs` alone (pass `-Force` / `--force` to overwrite them too).
7. Records everything it installed in `<project>/.allure3-bridge/manifest.txt`, so uninstall can remove exactly that later and nothing else in the project is ever touched.
8. Registers the two jars in `.classpath` if one exists, so Katalon's editor resolves the Allure classes without a manual refresh.

Re-running install against the same project **upgrades** it in place.
Uninstall removes exactly what's in the manifest; generated output and
your config are kept by default.

## What gets installed

```
Test Listeners/Allure3TestListener.groovy       auto-discovered by Katalon, the only wiring needed
Keywords/allure3/Allure3ReportBridge.groovy     engine: status mapping, attachments, identity, report generation
Keywords/allure3/Allure3Config.groovy           allure3.properties reader, with ALLURE3_* env var overrides
Keywords/allure3/Allure3Keywords.groovy         optional: step(), attachText/Json/Html/File/Screenshot, epic/feature/story/severity/label/link/issue/tmsLink/parameter
Include/config/allure3/allure3.properties       configuration (results dir, identity, screenshot policy)
Include/config/allure3/categories.json          failure categorization tuned to Katalon/Selenium exception types
Drivers/allure-java-commons-2.35.4.jar          Apache-2.0, Qameta Software, the only 2 extra jars needed
Drivers/allure-model-2.35.4.jar
Drivers/fetch-allure-jars.ps1                   re-download the 2 jars from Maven Central (sha1-verified) if your org won't commit binaries to git
allurerc.mjs                                    Allure 3's own config, generated with a matcher per browser
.allure3-bridge/cli.json                        which Allure 3 CLI and node binary to run
.allure3-bridge/manifest.txt                    exactly what was installed, for a clean uninstall
```

There is no "View Allure Report" helper here, and none is needed. Every
run produces one self-contained `.html` with all of its data embedded
inline, so you double-click it like any other HTML file.

## Using it

**Zero-touch (default):** every test suite run automatically produces one
Allure result per test case, with status, timing, a failure screenshot
(WebUI only) and stack trace on failure, and suite/host/thread/framework
labels. A self-contained `allure-report/<Name>_<timestamp>.html` is
generated at the end of the run, with Trend and Retries carried forward
from previous runs.

`<Name>` is whatever you actually ran:

- **A Test Suite Collection** running multiple Test Suites, named after
  the collection, with all of its Test Suites combined into **one**
  report rather than one per Test Suite. Katalon has no public API that
  hands a collection's name to a Test Listener, so the bridge derives it
  from the run's own report folder structure instead.
- **A single Test Suite**, named after that suite.
- **A lone Test Case** run directly with no saved suite involved, named
  after that test case.

Browsers become first-class Allure 3 **environments**, so the report has
an environment switcher rather than a `(Chrome)` suffix glued onto a
suite name. A suite that never opens a browser, such as an API-only test
case, does not get one, since it never actually used one. If a Collection
runs the same Test Suite more than once, each occurrence stays its own
entry instead of being merged.

History lives in `allure-history.jsonl`, outside the report. Because it
is external, single-file reports carry Trend and Retries forward too,
which the Allure 2 bridge could not do.

**Opt-in step detail**, from inside a Test Case script or Cucumber glue:

```groovy
CustomKeywords.'allure3.Allure3Keywords.step'('Log in as admin', {
    WebUI.setText(findTestObject('Page/input_Username'), 'admin')
    WebUI.click(findTestObject('Page/button_Login'))
})
CustomKeywords.'allure3.Allure3Keywords.severity'('critical')
CustomKeywords.'allure3.Allure3Keywords.epic'('Patient Management')
CustomKeywords.'allure3.Allure3Keywords.attachJson'('Booking payload', responsePayload)
```

## Charts

The report has a **Charts** section already, with no extra plugin and no
second file. Allure 3's `awesome` report defaults its `sections` to
`["charts", "timeline"]`, and the bridge leaves that alone.

Some charts work off history alone and fill up as you accumulate runs.
The rest need labels Katalon has no concept of, so they stay empty until
test cases set them:

```groovy
import allure3.Allure3Keywords as Allure3

Allure3.severity('critical')              // Test results by severities
Allure3.epic('Checkout')                  // Stability distribution by epics
Allure3.feature('Payment')                // ... by features
Allure3.story('Pay with a saved card')    // ... by stories
Allure3.label('layer', 'e2e')             // Testing pyramid
```

`layer` is the sharp edge. The testing pyramid has exactly three buckets,
**`unit`, `integration` and `e2e`**, and silently ignores every other
value, so a sensible-looking `ui` or `api` leaves all three bars at zero.
Matching is case-insensitive. To chart your own layer names instead,
override `layers` on that chart in `allurerc.mjs`.

Status transitions deserves a note too: it plots tests whose status
*changed* between runs. A test that fails identically every run
contributes nothing to it.

## Configuration

Everything lives in `Include/config/allure3/allure3.properties`, and every
key is overridable by an `ALLURE3_<KEY_IN_UPPER_SNAKE_CASE>` environment
variable so CI can redirect output without editing a checked-in file.

| Key | Default | What it does |
|---|---|---|
| `allure3.enabled` | `true` | master switch |
| `allure3.results.dir` | `allure-results` | where raw results are written |
| `allure3.report.dir` | `allure-report` | where reports are written |
| `allure3.report.single.file` | `true` | one self-contained `.html` per run |
| `allure3.history.file` | `allure-history.jsonl` | Trend/Retries accumulation |
| `allure3.config.file` | `allurerc.mjs` | Allure 3's own config |
| `allure3.separate.suites.as.parameters` | `true` | keeps cross-suite runs distinct |
| `allure3.separate.browsers.as.parameters` | `true` | keeps per-browser history distinct |
| `allure3.capture.steps` | `true` | Katalon log lines become nested Allure steps |
| `allure3.step.diag.enabled` | `false` | write `allure3-step-diag.txt` while investigating missing steps |
| `allure3.attach.screenshot.on.failure` | `true` | screenshot when a test does not pass |
| `allure3.generate.timeout.seconds` | `120` | give up after this long |

The two identity keys are documented at length in the properties file
itself. Read that before turning either off, because both exist to stop
Allure 3 hiding a failing run behind a passing one.

`allurerc.mjs` at the project root holds what the properties file cannot
express: environments, categories, quality gates, variables. The
installer generates it with a matcher per browser and leaves it alone
afterwards unless you pass `--force`.

### Failing the build on regressions

Uncomment the `qualityGate` block the installer leaves in `allurerc.mjs`:

```js
qualityGate: {
  rules: [{ maxFailures: 0, fastFail: false }],
},
```

Then run `allure quality-gate` as a CI step; it exits non-zero when a rule
is breached. This has no Allure 2 equivalent.

## What you gain over the Allure 2 bridge

- **Trends in single-file reports.** Allure 2 embedded history inside the
  report folder, so single-file mode could never carry it forward. Allure
  3 keeps history in an external JSONL file, so it works in both modes.
- **No PATH hunting.** The CLI is pinned and its exact path recorded at
  install time. The failure mode where a GUI-launched Katalon Studio
  could not see a volta/nvm/homebrew `allure` is gone.
- **Environments.** Browsers map to first-class Allure 3 environments
  rather than a `(Chrome)` suffix glued onto the suite name.
- **Faster.** The same six-result run generates in about 140ms.
- **Charts.** Status dynamics and transitions, test base growth, duration
  histograms, stability distributions, testing pyramid.
- **Quality gates**, known issues, `allure watch` for live reports, and
  the csv/dashboard/log/slack/testplan plugins, all through `allurerc.mjs`.

## Migrating from allure-katalon-bridge

Nothing collides: the Groovy package is `allure3`, keywords live in
`Keywords/allure3/`, the listener is `Allure3TestListener`, config is in
`Include/config/allure3/`, and state files are `.allure3-*`. Both bridges
can sit in one project while you switch over.

Do not leave both *enabled*, though. Two listeners writing every test
case into the same results directory produces duplicates. Remove one
listener, or set `allure.enabled=false` on the old one.

Existing Allure 2 trend history does not carry over. Allure 3's history
format and its recomputed identifiers are both different, so the new
report starts its trend fresh.

## CI setup

`executor.json` auto-detects Jenkins, Azure Pipelines, GitHub Actions and
GitLab CI from each platform's own standard environment variables, so the
report header links back to the build that produced it with nothing to
configure. The self-contained HTML report is already on disk by the time
your Katalon step finishes.

The big difference from the Allure 2 bridge is what is **not** here: no
step installs Allure. Allure 3's CLI ships pinned inside this package and
its exact path is recorded at install time, so there is no
`npm install -g allure-commandline`, no release tarball to unpack, and no
PATH to get right on any of the three platforms. Node 18+ is the only
prerequisite, because that CLI is a Node program.

This repo includes three ready-to-copy configs,
[`azure-pipelines.example.yml`](azure-pipelines.example.yml),
[`github-actions.example.yml`](github-actions.example.yml) and
[`gitlab-ci.example.yml`](gitlab-ci.example.yml). Pick the one matching
your platform, copy it in under the filename your CI expects, fill in the
one TODO (your Test Suite or Test Suite Collection path), and add your
Katalon API key as described below.

### Azure Pipelines

1. Copy `azure-pipelines.example.yml` into your repo as `azure-pipelines.yml`.
2. Install the **"Execute Katalon Studio Tests"** extension from the Azure
   DevOps Marketplace if your organization doesn't already have it
   (Organization Settings, Extensions, Browse Marketplace, search
   "Katalon").
3. Under **Pipelines, Library**, create a variable group named `Katalon`
   with a secret variable `KatalonApiKey` holding your Katalon Runtime
   Engine API key (Katalon Store, Profile, API Key). Marking it secret
   keeps it masked in every log line.
4. Replace `<YourCollection>` in the `executeArgs` line with your actual
   Test Suite Collection path, or swap `-testSuiteCollectionPath` for
   `-testSuitePath="Test Suites/<YourSuite>"` to run a single suite.
5. Commit and push. The pipeline runs on every push to `main`.

Reports show up on the pipeline run's **Summary** tab, in the artifacts
panel near the top, as `katalon-reports-<OS>` and `allure-report-<OS>`.

### GitHub Actions

1. Copy `github-actions.example.yml` into your repo as
   `.github/workflows/katalon-ci.yml`.
2. Under **Settings, Secrets and variables, Actions**, add a repository
   secret named `KATALON_API_KEY` with your Katalon Runtime Engine API key.
3. Replace `<YourCollection>` in the `args` line the same way as above.
4. Commit and push.

Reports show up on the **Actions** tab, under that run's summary page, in
the **Artifacts** section at the bottom.

The example config already includes the bridge itself as a GitHub Action,
so CI always runs against the current version without a raw npx command:

```yaml
- uses: montbaga/allure3-katalon-bridge@v1
  with:
    project-path: '${{ github.workspace }}'
```

### GitLab CI

1. Copy `gitlab-ci.example.yml` into your repo as `.gitlab-ci.yml`.
2. Under **Settings, CI/CD, Variables**, add a variable named
   `KATALON_API_KEY` with your Katalon Runtime Engine API key, and check
   "Mask variable".
3. Replace `<YourCollection>` in the `script` line the same way as above.
4. Commit and push.

The Linux job uses Katalon's own official Docker image
(`katalonstudio/katalon`), which ships Chrome and Firefox but not Edge, so
it runs on **Chrome, not Edge**. Adjust `-browserType` and any
browser-specific test logic accordingly. Windows and macOS jobs using
GitLab's hosted SaaS runners are included commented out, since they depend
on what your plan has enabled.

Reports show up on the pipeline job's page, in the **Job artifacts** panel.

### Worth knowing regardless of platform

- **Trend and Retries need the history file to survive between runs.**
  Allure 3 keeps history in `allure-history.jsonl`, outside the report, so
  every example above caches and restores it. Without that a CI report is
  technically correct but starts blank every time. This is the part the
  Allure 2 bridge could not do at all in single-file mode.
- **All three configs keep the bridge itself up to date in CI**, either
  via the GitHub Action or a plain `npx allure3-katalon-bridge install`
  step, so a pipeline produces real Allure reports even if nobody ran the
  installer locally first. It does **not** commit anything back to your
  repo, so a local Katalon Studio run still needs the installer run and
  committed once. This only keeps CI's own checkout current.
- **`--config -webui.autoUpdateDrivers=true`** is in all three examples. A
  hosted CI agent's browser updates itself, and Katalon's bundled WebUI
  driver can fall behind it, so without this a WebUI suite starts failing
  with `SessionNotCreatedException` purely because the agent's browser
  moved on. The `--config` prefix is required; the flag on its own is
  rejected by Katalon's console-mode argument parser.
- **Quality gates** are commented out in every example. Uncomment the
  `qualityGate` block in `allurerc.mjs` and the matching CI step, and the
  build fails on a regression instead of only reporting it. This has no
  Allure 2 equivalent.
- **Running more than one Katalon step in the same Azure Pipelines job?**
  Add the `bin/`-clearing step before *each* one. `katalonTask` locates the
  project by scanning for a `*.prj` file, and will find a stray copy left
  in `bin/` by an earlier step before it finds the real one.

## Troubleshooting

**Install fails with "Node.js was not found on PATH".** Allure 3's CLI is
a Node program, so the bridge needs Node 18 or newer. Install it from
[nodejs.org](https://nodejs.org/) and run the installer again. Unlike the
Allure 2 bridge, there is no fallback here: there is no Java `allure`
launcher to find.

**No `[Allure3]` lines in the console after a run.** The listener was not
picked up. Refresh the project in Katalon Studio so it compiles the newly
installed `Test Listeners/` and `Keywords/allure3/` files, then run
again. Check `allure3.enabled` is not set to `false`.

**A `[Allure3] Could not auto-generate the HTML report` warning.** The
recorded Allure 3 CLI could not be run. This usually means the project was
committed to git and checked out on another machine, so the absolute path
in `.allure3-bridge/cli.json` no longer exists there. Re-run the
installer on that machine, or install with `--vendor-cli` so the CLI
travels inside the project, or point `allure3.cli.path` at one directly.

**The report shows fewer tests than you ran, and says passed when
something failed.** That is Allure 3 collapsing distinct runs into
retries. Check that `allure3.separate.suites.as.parameters` and
`allure3.separate.browsers.as.parameters` are both still `true`. See
"Why Allure 3, and why this is not a drop-in swap" above.

**Charts are empty.** Most of them need labels Katalon does not write on
its own. See [Charts](#charts) above, and note that the testing pyramid
only recognises the layer values `unit`, `integration` and `e2e`.

**Test Suite Collection report seems to be missing one member suite's
results.** Every suite in a Collection shares one `allure-results/`
folder, and the report is only generated once every member has finished.
If a member suite never reaches its own `AfterTestSuite` because it was
aborted, killed, or crashed mid-run, its results will not be in the folder
when the report is built. Check the console for `[Allure3]` lines from
every expected suite.

For anything else, open an issue on this repo, or reach out. See Support
below.

## Support

Questions, bug reports, or need help wiring this into a specific CI/CD
setup? Open an issue on this repo, or reach out directly for consulting:
**bagati.monty@gmail.com**.

## License

Apache-2.0. See [`LICENSE.md`](LICENSE.md).
