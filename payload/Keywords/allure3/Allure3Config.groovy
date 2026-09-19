package allure3

import com.kms.katalon.core.configuration.RunConfiguration

/**
 * Reads Include/config/allure3/allure3.properties, with every key
 * overridable via an ALLURE3_<KEY_IN_UPPER_SNAKE_CASE> environment
 * variable so CI systems can redirect output without editing files
 * checked into the repo.
 *
 * The Allure 2 bridge's equivalent had a single "allure.commandline.path"
 * escape hatch for finding a Java launcher on PATH. Allure 3 is a Node
 * program that this bridge pins as its own npm dependency, so the
 * equivalent keys here (allure3.cli.path, allure3.node.path) exist only
 * as overrides for unusual setups - the installer normally records both
 * paths in .allure3-bridge/cli.json and neither key needs setting.
 */
class Allure3Config {

    private static final String CONFIG_RELATIVE_PATH = 'Include/config/allure3/allure3.properties'

    private static final String DEFAULT_CATEGORIES_RELATIVE_PATH = 'Include/config/allure3/categories.json'

    private static final String DEFAULT_RESULTS_DIR_NAME = 'allure-results'

    private static final String DEFAULT_REPORT_DIR_NAME = 'allure-report'

    private static final String DEFAULT_HISTORY_FILE = 'allure-history.jsonl'

    private static Properties fileProps

    private static synchronized Properties fileProperties() {
        if (fileProps == null) {
            fileProps = new Properties()
            File configFile = new File(RunConfiguration.getProjectDir(), CONFIG_RELATIVE_PATH)
            if (configFile.exists()) {
                configFile.withInputStream { stream -> fileProps.load(stream) }
            }
        }
        return fileProps
    }

    private static String read(String key, String defaultValue) {
        // Every key here already starts with "allure3." (e.g.
        // "allure3.results.dir"), so upper-casing and swapping dots for
        // underscores alone already produces "ALLURE3_RESULTS_DIR" - no
        // extra prefix needed on top of that.
        String envKey = key.toUpperCase().replace('.', '_')
        String envValue = System.getenv(envKey)
        if (envValue != null && !envValue.trim().isEmpty()) {
            return envValue.trim()
        }
        return fileProperties().getProperty(key, defaultValue)
    }

    private static File resolvePath(String configuredPath) {
        if (configuredPath == null || configuredPath.trim().isEmpty()) {
            return null
        }
        File file = new File(configuredPath.trim())
        return file.isAbsolute() ? file : new File(RunConfiguration.getProjectDir(), configuredPath.trim())
    }

    static boolean isEnabled() {
        return Boolean.parseBoolean(read('allure3.enabled', 'true'))
    }

    static File getResultsDir() {
        return resolvePath(read('allure3.results.dir', DEFAULT_RESULTS_DIR_NAME))
    }

    /**
     * Whether to clear this run's predecessor result files out of
     * allure3.results.dir at the start of every suite, so each generated
     * report reflects only the run it's named after. Turn off if you run
     * multiple suites in true parallel against the same results directory.
     */
    static boolean cleanResultsBeforeRun() {
        return Boolean.parseBoolean(read('allure3.clean.results.before.run', 'true'))
    }

    static boolean attachScreenshotOnFailure() {
        return Boolean.parseBoolean(read('allure3.attach.screenshot.on.failure', 'true'))
    }

    static boolean attachScreenshotAlways() {
        return Boolean.parseBoolean(read('allure3.attach.screenshot.always', 'false'))
    }

    static File getCategoriesFile() {
        return resolvePath(read('allure3.categories.file', DEFAULT_CATEGORIES_RELATIVE_PATH))
    }

    static boolean autoGenerateReport() {
        return Boolean.parseBoolean(read('allure3.auto.generate.report', 'true'))
    }

    static boolean singleFileReport() {
        return Boolean.parseBoolean(read('allure3.report.single.file', 'true'))
    }

    static File getReportDir() {
        return resolvePath(read('allure3.report.dir', DEFAULT_REPORT_DIR_NAME))
    }

    /**
     * The JSONL file Allure 3 accumulates run history in. This replaces
     * Allure 2's history/ directory entirely: because it lives outside the
     * report rather than inside it, single-file reports now carry Trend
     * and Retries forward, which the Allure 2 bridge could not do.
     * Set to an empty value to disable history accumulation.
     */
    static File getHistoryFile() {
        return resolvePath(read('allure3.history.file', DEFAULT_HISTORY_FILE))
    }

    /**
     * The allurerc config file passed to the CLI with -c. The installer
     * generates one; anything it declares (environments, categories,
     * quality gate) wins over the command-line flags the bridge sets.
     */
    static File getConfigFile() {
        return resolvePath(read('allure3.config.file', 'allurerc.mjs'))
    }

    /**
     * Whether to write the suite name as an Allure parameter so that the
     * same reusable test case, run from two different suites, stays two
     * distinct tests in the report.
     *
     * On by default, and turning it off is rarely what you want: Allure 3
     * groups retries by md5(testCaseId : parametersHash : environmentId)
     * and shows only the newest attempt in a group. Katalon reuses one
     * test case across suites under a single testCaseId, so without this
     * parameter every such run collapses into one test and a failure in
     * any run but the last is hidden - the report shows "passed".
     * See startTestCase() for the full mechanism.
     */
    static boolean separateSuitesAsParameters() {
        return Boolean.parseBoolean(read('allure3.separate.suites.as.parameters', 'true'))
    }

    /**
     * Whether to write the active browser as an Allure parameter, in
     * addition to the "browser" label the generated allurerc matches
     * environments on.
     *
     * The label alone is not enough. An environment separates tests in the
     * report body, but Allure 3 computes historyId as
     * "testCase.id + hash(parameters)" with no environment component, so
     * the same suite and test case run against two browsers otherwise
     * share one history entry - the newest run overwrites the other, a
     * browser-specific failure vanishes from Trend, and the test gets
     * flagged flaky for a pass/fail pair that was really two different
     * browsers. The parameter gives each browser its own history line.
     */
    static boolean separateBrowsersAsParameters() {
        return Boolean.parseBoolean(read('allure3.separate.browsers.as.parameters', 'true'))
    }

    /** Absolute path to an Allure 3 CLI entry point, only needed if the installer's own record is missing or stale. */
    static String getCliPath() {
        return read('allure3.cli.path', '')?.trim() ?: null
    }

    /** Absolute path to a node executable, only needed if auto-detection picks the wrong one. */
    static String getNodePath() {
        return read('allure3.node.path', '')?.trim() ?: null
    }

    /** How long to wait for report generation before giving up. Allure 3 is markedly faster than Allure 2, but very large result sets still take time. */
    static int generateTimeoutSeconds() {
        try {
            return Integer.parseInt(read('allure3.generate.timeout.seconds', '120'))
        } catch (Throwable ignored) {
            return 120
        }
    }

    static boolean captureSteps() {
        return Boolean.parseBoolean(read('allure3.capture.steps', 'true'))
    }

    /**
     * Writes allure3-step-diag.txt in the project root, recording how each
     * test case's step parsing went.
     *
     * Off by default. It appends on every run with no natural end, and is
     * only worth reading when steps are missing from a report, so leaving
     * it on just grows a file in the project root that nothing ever reads.
     */
    static boolean stepDiagEnabled() {
        return Boolean.parseBoolean(read('allure3.step.diag.enabled', 'false'))
    }

    /** Test-only hook so a single JVM run can pick up edited properties between tests. */
    static synchronized void reset() {
        fileProps = null
    }
}
