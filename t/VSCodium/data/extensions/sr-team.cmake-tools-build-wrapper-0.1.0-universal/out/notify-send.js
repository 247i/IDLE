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
exports.hideNativeNotification = exports.showNativeNotification = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const extension_1 = require("./extension");
const notifications_1 = require("./notifications");
let notifyLastId = -1;
let notifyLastCmd = '';
async function showNativeNotification(config, message, type) {
    const extensionPath = (0, extension_1.getExtensionPath)();
    let cmd = `${config.Path} -p -a "${vscode.env.appName}: cmake-build"`;
    if (type === notifications_1.NotifyType.Success) {
        if (config.IconSuccess.length !== 0) {
            cmd += ` -i "${config.IconSuccess}"`;
        }
        else if ((await extensionPath).length !== 0) {
            cmd += ` -i "${await extensionPath}/icons/success.svg"`;
        }
    }
    else {
        if (config.IconFails.length !== 0) {
            cmd += ` -i "${config.IconFails}"`;
        }
        else if ((await extensionPath).length !== 0) {
            cmd += ` -i "${await extensionPath}/icons/fail.svg"`;
        }
    }
    cmd += ` "CMake Tools" "${message}"`;
    const critical = config.CriticalUrgencyForFails && type === notifications_1.NotifyType.Fail;
    (0, child_process_1.exec)(`${cmd} -t ${config.ShowTime} -u ${critical ? 'critical' : 'normal'}`, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage('cmake-build: Failed to send notification: ' + error);
            return;
        }
        if (stdout.length !== 0) {
            notifyLastId = parseInt(stdout, 10);
            notifyLastCmd = cmd;
        }
        if (stderr.length !== 0) {
            vscode.window.showWarningMessage('cmake-build: `notify-send` error: ' + stderr);
            return;
        }
    });
    return true;
}
exports.showNativeNotification = showNativeNotification;
async function hideNativeNotification() {
    if (notifyLastId === -1 || notifyLastCmd.length === 0) {
        return;
    }
    // Use timer to avoid error "Created too many similar notifications in quick succession"
    const cmd = notifyLastCmd;
    const id = notifyLastId;
    setTimeout(() => { (0, child_process_1.exec)(`${cmd} -t 1 -u normal -r ${id}`); }, 1000);
}
exports.hideNativeNotification = hideNativeNotification;
//# sourceMappingURL=notify-send.js.map