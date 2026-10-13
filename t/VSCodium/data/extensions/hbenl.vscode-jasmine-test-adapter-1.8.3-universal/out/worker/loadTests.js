"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const loadTestsReporter_1 = require("./loadTestsReporter");
const patchJasmine_1 = require("./patchJasmine");
function sendMessage(message) {
    if (!process.send)
        return Promise.resolve();
    return new Promise((resolve, reject) => {
        process.send(message, undefined, undefined, error => {
            if (error)
                reject(error);
            else
                resolve();
        });
    });
}
let logEnabled = false;
try {
    const jasminePath = process.argv[2];
    const configFile = process.argv[3];
    const testFileGlobs = JSON.parse(process.argv[4]);
    logEnabled = JSON.parse(process.argv[5]);
    const Jasmine = require(jasminePath);
    const jasmine = new Jasmine({});
    if (logEnabled)
        sendMessage('Patching Jasmine');
    const locations = (0, patchJasmine_1.patchJasmine)(jasmine, testFileGlobs);
    if (logEnabled)
        sendMessage('Loading config file');
    jasmine.loadConfigFile(configFile);
    if (logEnabled)
        sendMessage('Executing Jasmine');
    jasmine.execute(undefined, '$^');
    if (logEnabled)
        sendMessage('Creating and adding reporter');
    jasmine.env.addReporter(new loadTestsReporter_1.LoadTestsReporter(sendMessage, locations));
}
catch (err) {
    if (logEnabled)
        sendMessage(`Caught error ${util.inspect(err)}`);
    throw err;
}
//# sourceMappingURL=loadTests.js.map