"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadTestsReporter = void 0;
class LoadTestsReporter {
    constructor(onDone, locations) {
        this.onDone = onDone;
        this.locations = locations;
        this.rootSuite = {
            type: 'suite',
            id: 'root',
            label: 'Jasmine',
            file: '.',
            children: [],
        };
        this.suiteStack = [this.rootSuite];
    }
    get currentSuite() {
        return this.suiteStack[this.suiteStack.length - 1];
    }
    suiteStarted(result) {
        const suite = {
            type: 'suite',
            id: result.fullName,
            label: result.description,
            children: []
        };
        const location = this.locations.get(result.id);
        if (location) {
            suite.file = location.file;
            suite.line = location.line;
        }
        this.currentSuite.children.push(suite);
        this.suiteStack.push(suite);
    }
    suiteDone() {
        this.currentSuite.children.sort((a, b) => {
            return a.line - b.line;
        });
        this.suiteStack.pop();
    }
    specStarted(result) {
        const test = {
            type: 'test',
            id: result.fullName,
            label: result.description,
            skipped: !!result.pendingReason
        };
        const location = this.locations.get(result.id);
        if (location) {
            test.line = location.line,
                test.file = location.file;
        }
        else {
            console.log('Could not find location for spec', result.fullName);
        }
        this.currentSuite.children.push(test);
    }
    jasmineDone(_, done) {
        this.onDone(this.rootSuite).then(done);
    }
}
exports.LoadTestsReporter = LoadTestsReporter;
//# sourceMappingURL=loadTestsReporter.js.map