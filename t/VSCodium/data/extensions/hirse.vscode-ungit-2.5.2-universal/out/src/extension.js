"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const vscode_1 = require("vscode");
const vscode_extension_telemetry_1 = __importDefault(require("vscode-extension-telemetry"));
const package_json_1 = __importDefault(require("../package.json"));
const modulePath = (0, node_path_1.join)(__dirname, "..", "..", "node_modules", "ungit", "bin", "ungit");
let iconPath;
let child;
let telemetryReporter;
function getWebViewHTML(uri, title) {
    const url = `http://localhost:8448/?noheader=true#/repository?path=${uri.fsPath}`;
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src http:;" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${title}</title>
            <style>
            html, body {
                height: 100%;
                width: 100%;
                padding: 0;
            }
            iframe {
                display: block;
                height: 100%;
                width: 100%;
                border: none;
            }
            </style>
        </head>
        <body>
            <iframe src="${url}" height="100%" width="100%" frameborder="0"></iframe>
        </body>
        </html>`;
}
/**
 * Determine the Ungit root from the current active file.
 * Let the user pick a workspace if there is no open file.
 */
function executeCommand() {
    var _a, _b;
    telemetryReporter.sendTelemetryEvent("extension.ungit");
    let workspaceFolderPromise;
    if (((_a = vscode_1.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.scheme) === "file") {
        workspaceFolderPromise = Promise.resolve(vscode_1.workspace.getWorkspaceFolder(vscode_1.window.activeTextEditor.document.uri));
    }
    else if (((_b = vscode_1.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b.length) === 1) {
        workspaceFolderPromise = Promise.resolve(vscode_1.workspace.workspaceFolders[0]);
    }
    else {
        workspaceFolderPromise = vscode_1.window.showWorkspaceFolderPick();
    }
    workspaceFolderPromise.then((workspaceFolder) => {
        if (typeof workspaceFolder === "undefined") {
            vscode_1.window.showErrorMessage("Can't open Ungit outside a workspace.");
        }
        else if (workspaceFolder.uri.scheme !== "file") {
            vscode_1.window.showErrorMessage("Can't open Ungit on remote workpaces.");
        }
        else {
            openInWorkspace(workspaceFolder);
        }
    }, () => {
        vscode_1.window.showErrorMessage("Can't open Ungit: Unable to determine workspace.");
    });
}
function openInWorkspace(workspaceFolder) {
    const ungitUri = workspaceFolder.uri.with({ scheme: "ungit" });
    const ungitTabTitle = `Ungit - ${workspaceFolder.name}`;
    vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Notification,
        title: "Starting Ungit",
        cancellable: true,
    }, (progress, token) => {
        token.onCancellationRequested(() => {
            if (child) {
                child.kill();
            }
        });
        return new Promise((resolve, reject) => {
            var _a, _b;
            const parameter = ["--no-b", "--ungitVersionCheckOverride"];
            const gitPath = vscode_1.workspace.getConfiguration("git").get("path");
            if (gitPath) {
                parameter.push(`--gitBinPath=${(0, node_path_1.dirname)(gitPath)}`);
            }
            child = (0, node_child_process_1.fork)(modulePath, parameter, { silent: true });
            const showInActiveColumn = vscode_1.workspace.getConfiguration("ungit", workspaceFolder.uri).get("showInActiveColumn") ===
                true;
            const viewColumn = showInActiveColumn ? vscode_1.ViewColumn.Active : vscode_1.ViewColumn.Beside;
            (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on("data", (message) => {
                const started = message.toString().includes("## Ungit started ##") ||
                    message.toString().includes("Ungit server already running") ||
                    message.toString().includes("EADDRINUSE: address already in use");
                if (started) {
                    progress.report({
                        increment: 100,
                    });
                    const panel = vscode_1.window.createWebviewPanel("ungit", ungitTabTitle, {
                        viewColumn,
                        preserveFocus: true,
                    }, {
                        retainContextWhenHidden: true,
                        enableScripts: true,
                    });
                    panel.webview.html = getWebViewHTML(ungitUri, ungitTabTitle);
                    panel.iconPath = vscode_1.Uri.file(iconPath);
                    resolve();
                }
            });
            (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on("error", (error) => {
                vscode_1.window.showErrorMessage(`Error opening Ungit: "${error.message}"`);
                telemetryReporter.sendTelemetryException(error);
                reject();
            });
        });
    });
}
function activate(context) {
    telemetryReporter = new vscode_extension_telemetry_1.default(package_json_1.default.name, package_json_1.default.version, "732684ea-6bd5-4ef0-a46d-bb9389c6aea5");
    iconPath = (0, node_path_1.join)(context.extensionPath, "images", "icon.png");
    const disposable = vscode_1.commands.registerCommand("extension.ungit", executeCommand);
    context.subscriptions.push(disposable, telemetryReporter);
    telemetryReporter.sendTelemetryEvent("activate");
}
exports.activate = activate;
function deactivate() {
    telemetryReporter.sendTelemetryEvent("deactivate");
    telemetryReporter.dispose();
    if (child) {
        child.kill();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map