#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const packageRoot = path.join(__dirname, '..');
const payloadRoot = path.join(packageRoot, 'payload');
const version = fs.readFileSync(path.join(packageRoot, 'VERSION'), 'utf8').trim();

const CONFIG_REL = path.join('Include', 'config', 'allure3', 'allure3.properties');
const CATEGORIES_REL = path.join('Include', 'config', 'allure3', 'categories.json');
const ALLURERC_REL = 'allurerc.mjs';
const BRIDGE_DIR = '.allure3-bridge';
const JARS_TO_REGISTER = [
    'Drivers/allure-java-commons-2.35.4.jar',
    'Drivers/allure-model-2.35.4.jar',
];
const CLEANUP_DIRS = ['Keywords/allure3', 'Include/config/allure3', 'Test Listeners', 'Drivers'];

function usage() {
    console.log(`allure3-katalon-bridge v${version}

Usage:
  allure3-katalon-bridge install <projectPath> [--force] [--vendor-cli]
  allure3-katalon-bridge uninstall <projectPath> [--remove-config]

  install       Copies the bridge into a Katalon Studio project and records
                the Allure 3 CLI it should run.
                --force       also overwrites an existing allure3.properties
                              and allurerc.mjs.
                --vendor-cli  copies the Allure 3 CLI into the project itself,
                              so the project stays runnable on a machine that
                              never ran this installer (CI images, a fresh
                              checkout). Larger, but self-contained.
  uninstall     Removes a previously installed bridge, using the manifest
                install left behind. --remove-config also deletes
                allure3.properties, categories.json and allurerc.mjs.
`);
}

function findPrjFile(projectPath) {
    return fs.readdirSync(projectPath, { withFileTypes: true })
        .find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.prj'));
}

function walkFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkFiles(full));
        } else if (entry.isFile()) {
            results.push(full);
        }
    }
    return results;
}

function install(projectPath, flags) {
    if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
    }
    projectPath = fs.realpathSync(projectPath);
    const force = flags.has('--force');

    const prjFile = findPrjFile(projectPath);
    if (!prjFile) {
        throw new Error(`No *.prj file found directly under '${projectPath}'. This does not look like a Katalon Studio project root - aborting to avoid writing into the wrong folder.`);
    }

    console.log(`Installing Allure3-Katalon Bridge v${version} into: ${projectPath}`);
    console.log(`  (detected Katalon project: ${prjFile.name})`);

    const manifestDir = path.join(projectPath, BRIDGE_DIR);
    fs.mkdirSync(manifestDir, { recursive: true });

    const installedFiles = [];
    for (const file of walkFiles(payloadRoot)) {
        const relativePath = path.relative(payloadRoot, file);
        const destPath = path.join(projectPath, relativePath);

        if (relativePath === CONFIG_REL && fs.existsSync(destPath) && !force) {
            console.log(`  SKIP (already customized, use --force to overwrite): ${relativePath}`);
            continue;
        }

        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(file, destPath);
        if (/\.(sh|command)$/.test(relativePath)) {
            fs.chmodSync(destPath, 0o755);
        }
        installedFiles.push(relativePath);
        console.log(`  OK   ${relativePath}`);
    }

    const cliDescriptor = writeCliDescriptor(projectPath, flags.has('--vendor-cli'));
    if (writeAllurercConfig(projectPath, force)) {
        installedFiles.push(ALLURERC_REL);
    }

    fs.writeFileSync(path.join(manifestDir, 'manifest.txt'), [version, ...installedFiles].join('\n') + '\n', 'utf8');

    registerClasspathJars(projectPath);

    console.log('');
    console.log('Install complete.');
    if (cliDescriptor) {
        console.log(`Allure 3 CLI: ${cliDescriptor.cli}`);
    }
    console.log('Next steps:');
    console.log('  1. Reopen (or refresh) the project in Katalon Studio.');
    console.log('  2. Run any Test Suite as usual - no changes needed to existing tests.');
    console.log("  3. Look for '[Allure3]' lines in the console, and an allure-report/ folder afterwards.");
    console.log('  4. The report is one self-contained .html file - just double-click it.');
}

/**
 * Records which Allure 3 CLI the Groovy side should run, and which node
 * binary to run it with.
 *
 * Resolving this once, here, is what lets the bridge skip PATH detection
 * entirely at test time. Allure 2's CLI was a Java launcher that had to be
 * found on PATH, which failed whenever Katalon Studio was launched from
 * Finder/Dock/Start Menu rather than a shell - a GUI-launched app never
 * sources the login shell profile that volta/nvm/homebrew rely on. Allure 3
 * is a Node program pinned as this package's own dependency, so the exact
 * path is knowable at install time. Invoking node directly on the CLI's
 * .js entry point also avoids Windows' inability to launch a .cmd shim
 * from Java's ProcessBuilder.
 */
function writeCliDescriptor(projectPath, vendor) {
    let cliPath = resolveAllureCli();
    if (!cliPath) {
        console.warn('  WARN  Could not resolve the pinned Allure 3 CLI. The bridge will fall back to "allure" on PATH.');
        return null;
    }

    if (vendor) {
        // Copy the whole node_modules tree the CLI sits in, not just the
        // allure package: it imports its own @allurereport/* packages at
        // runtime, so a lone package directory would not start.
        const nodeModulesRoot = path.dirname(allurePackageRoot());
        const vendorRoot = path.join(projectPath, BRIDGE_DIR, 'cli', 'node_modules');
        console.log('  ...  vendoring the Allure 3 CLI into the project (--vendor-cli)');
        copyDirectory(nodeModulesRoot, vendorRoot);
        const vendored = path.join(vendorRoot, 'allure', 'cli.js');
        if (fs.existsSync(vendored)) {
            cliPath = vendored;
        }
    }

    const descriptor = { node: process.execPath, cli: cliPath, version, pinned: allureVersion() };
    fs.writeFileSync(path.join(projectPath, BRIDGE_DIR, 'cli.json'), JSON.stringify(descriptor, null, 2) + '\n', 'utf8');
    console.log(`  OK   ${BRIDGE_DIR}/cli.json`);
    return descriptor;
}

/**
 * Locates the pinned Allure 3 CLI entry point.
 *
 * require.resolve is no help here: the allure package declares an
 * "exports" map listing only ".", "./rules" and "./qualityGate", so Node
 * refuses every other subpath - including "./package.json". The bin entry
 * is also "./cli.js" at the package root, not the "dist/cli.js" the rest
 * of the package layout would suggest. So this walks node_modules
 * directories upward instead, which also covers npm hoisting the
 * dependency above this package.
 */
function allurePackageRoot() {
    let dir = packageRoot;
    while (true) {
        const candidate = path.join(dir, 'node_modules', 'allure');
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
            return candidate;
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return null;
        }
        dir = parent;
    }
}

function resolveAllureCli() {
    const root = allurePackageRoot();
    if (!root) {
        return null;
    }
    for (const rel of ['cli.js', path.join('dist', 'cli.js')]) {
        const candidate = path.join(root, rel);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

function allureVersion() {
    const root = allurePackageRoot();
    if (!root) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    } catch (err) {
        return null;
    }
}

function copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(from, to);
        } else if (entry.isFile()) {
            fs.copyFileSync(from, to);
        }
    }
}

/**
 * Generates the project's allurerc.mjs.
 *
 * The environments block is the half of the test-identity fix that lives
 * outside Groovy. The bridge writes a "browser" label on every test case
 * that actually opened a browser; each matcher below turns that label into
 * an Allure 3 environment, which feeds the environmentId component of
 * Allure 3's retry grouping. Without it, the same test case run against
 * Chrome and Firefox is one test with one run hidden as a retry.
 *
 * Environment ids are restricted to latin letters, digits, underscores and
 * hyphens by Allure 3 itself - "Edge Chromium" is rejected outright - so
 * each id is slugified while the display name keeps the original spelling.
 */
function writeAllurercConfig(projectPath, force) {
    const target = path.join(projectPath, ALLURERC_REL);
    if (fs.existsSync(target) && !force) {
        console.log(`  SKIP (already customized, use --force to overwrite): ${ALLURERC_REL}`);
        return false;
    }

    const browsers = ['Chrome', 'Firefox', 'Edge Chromium', 'Safari', 'IE', 'Remote'];
    const envEntries = browsers.map((browser) => {
        const id = browser.replace(/[^A-Za-z0-9_-]/g, '_');
        return `    ${id}: byBrowser(${JSON.stringify(browser)}),`;
    }).join('\n');

    const contents = `// Generated by allure3-katalon-bridge. Safe to edit - the installer will
// not overwrite it again unless you pass --force.
//
// Deliberately no 'import { defineConfig } from "allure"'. Allure 3 is
// pinned inside the bridge's own package, not installed into this Katalon
// project, so an ESM import of "allure" from here fails with "Cannot find
// package 'allure'". defineConfig is only an identity function used for
// TypeScript typing, so exporting the object directly is equivalent and
// resolves from any directory. Add the import back if you install allure
// into this project yourself and want editor type hints.
//
// Each environment below matches the "browser" label the bridge writes on
// any test case that actually opened a browser. This is not cosmetic:
// Allure 3 groups retries by md5(testCaseId : parametersHash :
// environmentId) and shows only the newest attempt in a group, so without
// an environment to separate them, one Katalon test case run against
// Chrome and Firefox becomes a single test with one run hidden.
//
// Environment ids may contain only latin letters, digits, underscores and
// hyphens, which is why "Edge Chromium" is keyed as Edge_Chromium.
const byBrowser = (browser) => ({
  matcher: ({ labels }) => labels.find((l) => l.name === "browser" && l.value === browser),
  variables: { Browser: browser },
});

export default {
  name: "Katalon Test Run",
  output: "./allure-report",

  // Allure 3 keeps history in one JSONL file outside the report, replacing
  // Allure 2's history/ directory. Because it is external, single-file
  // reports carry Trend and Retries forward too.
  historyPath: "./allure-history.jsonl",

  environments: {
${envEntries}
  },

  plugins: {
    awesome: {
      options: {
        singleFile: true,
        groupBy: ["suite"],
      },
    },
  },

  // Fail the build on regressions. Uncomment and tune to taste - Allure 3
  // exits non-zero when a rule is breached, which is new in 3.x.
  // qualityGate: {
  //   rules: [{ maxFailures: 0, fastFail: false }],
  // },
};
`;
    fs.writeFileSync(target, contents, 'utf8');
    console.log(`  OK   ${ALLURERC_REL}`);
    return true;
}

/**
 * Matches a classpathentry for one of our jars regardless of how the path
 * is spelled.
 *
 * Katalon rewrites the relative paths this installer writes into absolute
 * ones when it next opens the project, so a check for the exact relative
 * string stops matching and a re-install registers the same jar a second
 * time. Matching on the file name covers both spellings.
 */
function classpathEntryPattern(jarPath) {
    const fileName = jarPath.split('/').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Whitespace around the entry is matched horizontally only, so removing
    // one line leaves the next line's own indentation intact.
    return new RegExp(`[^\\S\\r\\n]*<classpathentry[^>]*path="[^"]*${fileName}"[^>]*/>[^\\S\\r\\n]*\\r?\\n?`, 'g');
}

// Best-effort: only touches .classpath if the project already has one, and
// only adds entries that aren't already there.
function registerClasspathJars(projectPath) {
    const classpathFile = path.join(projectPath, '.classpath');
    if (!fs.existsSync(classpathFile)) {
        return;
    }
    let xml = fs.readFileSync(classpathFile, 'utf8');
    if (!xml.includes('</classpath>')) {
        return;
    }
    let changed = false;
    for (const jarPath of JARS_TO_REGISTER) {
        if (!classpathEntryPattern(jarPath).test(xml)) {
            xml = xml.replace('</classpath>', `\t<classpathentry kind="lib" path="${jarPath}"/>\n</classpath>`);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(classpathFile, xml, 'utf8');
        console.log('  OK   .classpath (registered Drivers jars for the IDE editor)');
    }
}

/**
 * Removes the classpathentry lines install added, so uninstall does not
 * leave the IDE pointing at jars that are no longer on disk.
 */
function unregisterClasspathJars(projectPath) {
    const classpathFile = path.join(projectPath, '.classpath');
    if (!fs.existsSync(classpathFile)) {
        return;
    }
    let xml = fs.readFileSync(classpathFile, 'utf8');
    const before = xml;
    for (const jarPath of JARS_TO_REGISTER) {
        xml = xml.replace(classpathEntryPattern(jarPath), '');
    }
    if (xml !== before) {
        fs.writeFileSync(classpathFile, xml, 'utf8');
        console.log('  REMOVED  .classpath entries for the Drivers jars');
    }
}

function uninstall(projectPath, removeConfig) {
    if (!fs.existsSync(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
    }
    projectPath = fs.realpathSync(projectPath);

    const manifestPath = path.join(projectPath, BRIDGE_DIR, 'manifest.txt');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`No install manifest found at ${manifestPath} - this project doesn't look like it has the bridge installed.`);
    }

    const lines = fs.readFileSync(manifestPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
    const [installedVersion, ...files] = lines;
    console.log(`Uninstalling Allure3-Katalon Bridge v${installedVersion} from: ${projectPath}`);

    const configFiles = [CONFIG_REL, CATEGORIES_REL, ALLURERC_REL];

    for (const relativePath of files) {
        if (configFiles.includes(relativePath) && !removeConfig) {
            console.log(`  KEEP (config; pass --remove-config to delete): ${relativePath}`);
            continue;
        }
        const targetFile = path.join(projectPath, relativePath);
        if (fs.existsSync(targetFile)) {
            fs.unlinkSync(targetFile);
            console.log(`  REMOVED  ${relativePath}`);
        }
    }

    unregisterClasspathJars(projectPath);

    for (const dir of CLEANUP_DIRS) {
        const fullDir = path.join(projectPath, dir);
        if (fs.existsSync(fullDir) && fs.readdirSync(fullDir).length === 0) {
            fs.rmdirSync(fullDir);
            console.log(`  REMOVED  ${dir}/ (now empty)`);
        }
    }

    const vendoredCli = path.join(projectPath, BRIDGE_DIR, 'cli');
    if (fs.existsSync(vendoredCli)) {
        fs.rmSync(vendoredCli, { recursive: true, force: true });
        console.log(`  REMOVED  ${BRIDGE_DIR}/cli/ (vendored Allure 3 CLI)`);
    }

    fs.unlinkSync(manifestPath);
    const cliJson = path.join(projectPath, BRIDGE_DIR, 'cli.json');
    if (fs.existsSync(cliJson)) {
        fs.unlinkSync(cliJson);
    }
    const manifestDir = path.join(projectPath, BRIDGE_DIR);
    if (fs.existsSync(manifestDir) && fs.readdirSync(manifestDir).length === 0) {
        fs.rmdirSync(manifestDir);
    }

    console.log('');
    console.log('Uninstall complete.');
    console.log('Note: allure-results/, allure-report/ and allure-history.jsonl were left in place - delete them manually if you want them gone too.');
}

function parseArgs(argv) {
    const [command, ...rest] = argv;
    const flags = new Set();
    const positional = [];
    for (const arg of rest) {
        if (arg.startsWith('--')) {
            flags.add(arg);
        } else {
            positional.push(arg);
        }
    }
    return { command, projectPath: positional[0], flags };
}

function main() {
    const { command, projectPath, flags } = parseArgs(process.argv.slice(2));

    if (!command || command === '--help' || command === '-h') {
        usage();
        process.exit(command ? 0 : 1);
        return;
    }

    if (command !== 'install' && command !== 'uninstall') {
        console.error(`Unknown command: ${command}\n`);
        usage();
        process.exit(1);
        return;
    }

    if (!projectPath) {
        console.error('Missing <projectPath>.\n');
        usage();
        process.exit(1);
        return;
    }

    try {
        if (command === 'install') {
            install(projectPath, flags);
        } else {
            uninstall(projectPath, flags.has('--remove-config'));
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}

main();
