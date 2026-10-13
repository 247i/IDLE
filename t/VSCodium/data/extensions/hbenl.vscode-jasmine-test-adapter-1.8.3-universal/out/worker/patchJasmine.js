"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchJasmine = void 0;
const stackTrace = require("stack-trace");
const minimatch_1 = require("minimatch");
function patchJasmine(jasmine, globPatterns) {
    const globs = globPatterns.map(pattern => new minimatch_1.Minimatch(pattern));
    const locations = new Map();
    const env = jasmine.env;
    for (const functionName of ['describe', 'fdescribe', 'xdescribe', 'it', 'fit', 'xit']) {
        const origImpl = env[functionName];
        env[functionName] = function () {
            const result = origImpl.apply(this, arguments);
            const location = findCallLocation(globs, functionName);
            if (location) {
                locations.set(result.id, location);
            }
            return result;
        };
    }
    return locations;
}
exports.patchJasmine = patchJasmine;
function findCallLocation(globs, functionName) {
    const stackFrames = stackTrace.parse(new Error());
    for (const callSite of stackFrames) {
        const fileName = callSite.getFileName();
        if (fileName && globs.some(glob => glob.match(fileName))) {
            return {
                file: callSite.getFileName(),
                line: callSite.getLineNumber() - 1
            };
        }
    }
    for (var i = 0; i < stackFrames.length - 1; i++) {
        if (stackFrames[i].getFunctionName() === functionName) {
            const callSite = stackFrames[i + 1];
            return {
                file: callSite.getFileName(),
                line: callSite.getLineNumber() - 1
            };
        }
    }
    return undefined;
}
//# sourceMappingURL=patchJasmine.js.map