import com.kms.katalon.core.annotation.AfterTestCase
import com.kms.katalon.core.annotation.AfterTestSuite
import com.kms.katalon.core.annotation.BeforeTestCase
import com.kms.katalon.core.annotation.BeforeTestSuite
import com.kms.katalon.core.context.TestCaseContext
import com.kms.katalon.core.context.TestSuiteContext

import allure3.Allure3ReportBridge

/**
 * Drop-in listener that turns every Katalon test suite run into an Allure 3
 * report - zero changes required in existing Test Cases or Test Suites.
 *
 * Katalon auto-discovers every class under "Test Listeners" and invokes
 * annotated methods at the documented points in the run:
 *   BeforeTestSuite -> [BeforeTestCase -> test case body -> AfterTestCase]* -> AfterTestSuite
 *
 * All actual work is delegated to allure3.Allure3ReportBridge, which never
 * throws: a bug in report generation must never fail or change the result
 * of the real test.
 *
 * This class and its allure3.* package are named so they can sit alongside
 * an existing Allure 2 bridge install in the same project during a
 * migration. Running both at once writes each test case twice into the
 * same results directory, so keep only one listener enabled.
 */
class Allure3TestListener {

    @BeforeTestSuite
    def beforeTestSuite(TestSuiteContext testSuiteContext) {
        Allure3ReportBridge.startSuite(testSuiteContext)
    }

    @BeforeTestCase
    def beforeTestCase(TestCaseContext testCaseContext) {
        Allure3ReportBridge.startTestCase(testCaseContext)
    }

    @AfterTestCase
    def afterTestCase(TestCaseContext testCaseContext) {
        Allure3ReportBridge.finishTestCase(testCaseContext)
    }

    @AfterTestSuite
    def afterTestSuite(TestSuiteContext testSuiteContext) {
        Allure3ReportBridge.finishSuite(testSuiteContext)
    }
}
