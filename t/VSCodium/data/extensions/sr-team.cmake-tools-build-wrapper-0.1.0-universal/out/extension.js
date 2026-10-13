"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.getExtensionPath = void 0;
const vscode = __importStar(require("vscode"));
const api_1 = require("./api");
const notifications_1 = require("./notifications");
const config_1 = require("./config");
let cmakeToolsApi = undefined;
let cmakeProjectUri = undefined;
let cmakeProjectWatcher = undefined;
let extensionPath = undefined;
async function getExtensionPath() {
    return extensionPath || "";
}
exports.getExtensionPath = getExtensionPath;
async function openCMakeOutput(config) {
    if (config === undefined)
        config = config_1.Config.read();
    const baseCommand = `workbench.action.output.show.extension-output-${config.cmakeExtensionName}`;
    vscode.commands.getCommands(true).then((commands) => {
        if (config.outputView.length > 0) {
            for (const command of commands) {
                if (!command.startsWith(baseCommand)) {
                    continue;
                }
                if (command.endsWith(`-${config.outputView}`)) {
                    vscode.commands.executeCommand(command);
                    return;
                }
            }
        }
        for (const command of commands) {
            if (!command.startsWith(baseCommand)) {
                continue;
            }
            if (command.indexOf(`-CMake/`) > baseCommand.length) {
                vscode.commands.executeCommand(command);
                return;
            }
        }
    });
}
var CMakeAction;
(function (CMakeAction) {
    CMakeAction["Clean"] = "clean";
    CMakeAction["Build"] = "build";
    CMakeAction["Install"] = "install";
    CMakeAction["Configure"] = "configure";
    CMakeAction["Reconfigure"] = "reconfigure";
})(CMakeAction || (CMakeAction = {}));
class ActiveCMakeAction {
    static actions = [];
    name = '';
    constructor(name) {
        const index = ActiveCMakeAction.actions.indexOf(name);
        if (index > -1) {
            throw new Error(`CMake action "${name}" already in progress`);
        }
        this.name = name;
        ActiveCMakeAction.actions.push(name);
    }
    dispose() {
        const index = ActiveCMakeAction.actions.indexOf(this.name);
        if (index > -1) {
            ActiveCMakeAction.actions.splice(index, 1);
        }
    }
    static async getActiveActions() {
        return ActiveCMakeAction.actions;
    }
}
async function withErrorCheck(name, action) {
    try {
        const activeAction = new ActiveCMakeAction(name);
        const config = config_1.Config.read();
        action()
            .then(() => {
            if (config.notifySuccess) {
                (0, notifications_1.showNotification)(config, `${name} completed`, notifications_1.NotifyType.Success);
            }
            activeAction.dispose();
        })
            .catch((error) => {
            if (config.notifyFails) {
                (0, notifications_1.showNotification)(config, `${error}`, notifications_1.NotifyType.Fail);
            }
            if (config.openOutput) {
                openCMakeOutput(config);
            }
            activeAction.dispose();
        });
    }
    catch (error) {
        vscode.window.showWarningMessage(`cmake-build: ${error}`);
    }
}
async function doCmakeAction(action) {
    if (cmakeToolsApi === undefined || cmakeProjectUri === undefined) {
        vscode.window.showErrorMessage(`cmake-build: CMake Tools not initialized or project not opened`);
        return;
    }
    cmakeToolsApi.getProject(cmakeProjectUri).then((project) => {
        switch (action) {
            case CMakeAction.Clean:
                withErrorCheck(action, async () => (await project?.clean()));
                break;
            case CMakeAction.Build:
                withErrorCheck(action, async () => (await project?.build()));
                break;
            case CMakeAction.Install:
                withErrorCheck(action, async () => (await project?.install()));
                break;
            case CMakeAction.Configure:
                withErrorCheck(action, async () => (await project?.configure()));
                break;
            case CMakeAction.Reconfigure:
                withErrorCheck(action, async () => (await project?.reconfigure()));
                break;
            default:
                vscode.window.showErrorMessage(`cmake-build: Unknown action ${action}`);
                return;
        }
    });
}
async function resolveCMakeToolsApi() {
    const config = config_1.Config.read();
    const extensionId = config.cmakeExtensionName;
    const ext = vscode.extensions.getExtension(extensionId);
    if (!ext) {
        vscode.window.showWarningMessage(`cmake-build: extension '${extensionId}' is not installed. ` +
            `Install it or set 'cmake-tools-build-wrapper.cmakeExtensionName' to the correct extension ID.`);
        return undefined;
    }
    const exports = await ext.activate();
    return exports.getApi(2);
}
async function activate(context) {
    resolveCMakeToolsApi().then((cmakeApi) => {
        if (cmakeApi === undefined)
            return;
        cmakeToolsApi = cmakeApi;
        cmakeProjectWatcher = cmakeToolsApi.onActiveProjectChanged((projectUri) => {
            cmakeProjectUri = projectUri;
        });
        const path = cmakeToolsApi.getActiveFolderPath();
        cmakeProjectUri = vscode.Uri.file(path);
    });
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.cmakeExtensionName`)) {
            vscode.window.showInformationMessage('cmake-build: Reload the window to apply the new CMake Tools extension.', 'Reload Window').then(selection => {
                if (selection === 'Reload Window')
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
            });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.clean`, () => { doCmakeAction(CMakeAction.Clean); }));
    context.subscriptions.push(vscode.commands.registerCommand(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.build`, () => { doCmakeAction(CMakeAction.Build); }));
    context.subscriptions.push(vscode.commands.registerCommand(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.install`, () => { doCmakeAction(CMakeAction.Install); }));
    context.subscriptions.push(vscode.commands.registerCommand(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.configure`, () => { doCmakeAction(CMakeAction.Configure); }));
    context.subscriptions.push(vscode.commands.registerCommand(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.reconfigure`, () => { doCmakeAction(CMakeAction.Reconfigure); }));
    context.subscriptions.push(vscode.commands.registerCommand(`${api_1.CMakeToolsBuildWrapper.EXTENSION_NAME}.output`, () => { openCMakeOutput(); }));
    extensionPath = context.extensionPath;
    return {
        getActiveActions() {
            return ActiveCMakeAction.getActiveActions();
        }
    };
}
exports.activate = activate;
function deactivate() {
    cmakeProjectWatcher?.dispose();
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map