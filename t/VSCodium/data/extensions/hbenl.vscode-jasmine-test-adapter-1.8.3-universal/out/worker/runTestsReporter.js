"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunTestsReporter = void 0;
class RunTestsReporter {
    constructor(sendMessage, testsToReport) {
        this.sendMessage = sendMessage;
        this.testsToReport = testsToReport;
    }
    specStarted(result) {
        if ((this.testsToReport === undefined) ||
            (this.testsToReport.indexOf(result.fullName) >= 0)) {
            const event = {
                type: 'test',
                test: result.fullName,
                state: 'running'
            };
            this.sendMessage(event);
        }
    }
    specDone(result) {
        if ((this.testsToReport === undefined) ||
            (this.testsToReport.indexOf(result.fullName) >= 0)) {
            let failures;
            let message;
            if (result.failedExpectations) {
                failures = result.failedExpectations.map(failure => {
                    let stack = failure.stack;
                    if (stack && stack.match(/^\s+at/)) {
                        stack = failure.message + "\n" + stack;
                    }
                    return { stack, message: failure.message };
                });
                message = failures.map(failure => failure.stack).join('\n');
            }
            const state = convertTestState(result.status);
            const event = {
                type: 'test',
                test: result.fullName,
                state: convertTestState(result.status),
                message,
            };
            if ((state === 'failed') && failures) {
                event.failures = failures;
            }
            this.sendMessage(event);
        }
    }
}
exports.RunTestsReporter = RunTestsReporter;
function convertTestState(jasmineState) {
    switch (jasmineState) {
        case 'passed':
        case 'failed':
            return jasmineState;
        case 'pending':
        case 'excluded':
        default:
            return 'skipped';
    }
}
//# sourceMappingURL=runTestsReporter.js.map