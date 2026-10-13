"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const tslib_1 = require("tslib");
const vscode = require("vscode");
const vscode_test_adapter_api_1 = require("vscode-test-adapter-api");
const vscode_test_adapter_util_1 = require("vscode-test-adapter-util");
const adapter_1 = require("./adapter");
function activate(context) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];
        const channel = vscode.window.createOutputChannel('Jasmine Tests');
        const log = new vscode_test_adapter_util_1.Log('jasmineExplorer', workspaceFolder, 'Jasmine Explorer Log');
        const testExplorerExtension = vscode.extensions.getExtension(vscode_test_adapter_api_1.testExplorerExtensionId);
        if (log.enabled)
            log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);
        if (testExplorerExtension) {
            const testHub = testExplorerExtension.exports;
            context.subscriptions.push(new vscode_test_adapter_util_1.TestAdapterRegistrar(testHub, (workspaceFolder) => new adapter_1.JasmineAdapter(workspaceFolder, channel, log), log));
        }
    });
}
exports.activate = activate;
//# sourceMappingURL=main.js.map