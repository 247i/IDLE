"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util = require("util");
const RegExEscape = require("escape-string-regexp");
const runTestsReporter_1 = require("./runTestsReporter");
const sendMessage = process.send ? (message) => process.send(message) : console.log;
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    if (process.send) {
        const { configFile, jasminePath, logEnabled, testsToRun } = yield new Promise(resolve => process.once('message', resolve));
        yield execute(jasminePath, configFile, logEnabled, testsToRun);
    }
    else {
        const argv = process.argv;
        const jasminePath = argv[2];
        const configFile = argv[3];
        const logEnabled = JSON.parse(argv[4]);
        let testsToRun;
        if (argv.length > 5) {
            testsToRun = JSON.parse(argv[5]);
        }
        yield execute(jasminePath, configFile, logEnabled, testsToRun);
    }
}))();
function execute(jasminePath, configFile, logEnabled, testsToRun) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            const regExp = testsToRun ? testsToRun.map(RegExEscape).join('|') : undefined;
            const Jasmine = require(jasminePath);
            const jasmine = new Jasmine({ baseProjectPath: process.cwd });
            if (logEnabled)
                sendMessage('Loading config file');
            jasmine.loadConfigFile(configFile);
            jasmine.configureDefaultReporter({
                showColors: false
            });
            if (logEnabled)
                sendMessage('Executing Jasmine');
            jasmine.execute(undefined, regExp);
            if (logEnabled)
                sendMessage('Creating and adding reporter');
            jasmine.env.addReporter(new runTestsReporter_1.RunTestsReporter(sendMessage, testsToRun));
        }
        catch (err) {
            if (logEnabled)
                sendMessage(`Caught error ${util.inspect(err)}`);
            throw err;
        }
    });
}
//# sourceMappingURL=runTests.js.map