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
exports.showNotification = exports.NotifyType = void 0;
const vscode = __importStar(require("vscode"));
const notify_send_1 = require("./notify-send");
const config_1 = require("./config");
var NotifyType;
(function (NotifyType) {
    NotifyType[NotifyType["Success"] = 0] = "Success";
    NotifyType[NotifyType["Fail"] = 1] = "Fail";
})(NotifyType || (exports.NotifyType = NotifyType = {}));
async function showNotification(config, message, type = NotifyType.Success) {
    const defaultProvider = process.platform === 'linux' ? config_1.Config.NotifyProvider.VSCodeAndNotifySend : config_1.Config.NotifyProvider.VSCode;
    const provider = config.notifyProvider === config_1.Config.NotifyProvider.Default ? defaultProvider : config.notifyProvider;
    // Hide previous system notification
    // Need to avoid manual closing:
    // - fail notifications with critical urgency
    // - notifications with infinity time show
    (0, notify_send_1.hideNativeNotification)();
    const needShowSystemNotification = provider === 'Native Notifications' ||
        (provider.endsWith('/Native Notifications') && !vscode.window.state.focused);
    let notificationShowed = false;
    if (provider.startsWith('Custom provider') && !needShowSystemNotification) {
        notificationShowed = await showCustomNotification(config.customNotifyProvider, message);
    }
    if (provider.startsWith('VSCode API') && !needShowSystemNotification) {
        notificationShowed = await showVSCodeNotification(message, type);
    }
    if (needShowSystemNotification && !notificationShowed) {
        (0, notify_send_1.showNativeNotification)(config.notifySend, message, type);
    }
}
exports.showNotification = showNotification;
async function showCustomNotification(config, message) {
    if (config.ProviderCommand.length !== 0) {
        const argsOrdering = config.Arguments;
        if (argsOrdering === config_1.Config.CustomNotifyProviderArguments.messageOnly) {
            vscode.commands.executeCommand(config.ProviderCommand, `CMake Tools: ${message}`);
        }
        else if (argsOrdering === config_1.Config.CustomNotifyProviderArguments.titleThenMessage) {
            vscode.commands.executeCommand(config.ProviderCommand, "CMake Tools", `${message}`);
        }
        else if (argsOrdering === config_1.Config.CustomNotifyProviderArguments.messageThenTitle) {
            vscode.commands.executeCommand(config.ProviderCommand, `${message}`, "CMake Tools");
        }
        return true;
    }
    vscode.window.showErrorMessage(`cmake-build: Custom notification provider is not configured`);
    return false;
}
async function showVSCodeNotification(message, type) {
    if (type === NotifyType.Success) {
        vscode.window.showInformationMessage(`CMake Tools: ${message}`);
    }
    else {
        vscode.window.showWarningMessage(`CMake Tools ${message}`);
    }
    return true;
}
//# sourceMappingURL=notifications.js.map