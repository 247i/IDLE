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
exports.Config = void 0;
const vscode = __importStar(require("vscode"));
const api_1 = require("./api");
var Config;
(function (Config) {
    Config.DEFAULT_NOTIFY_SEND = {
        Path: 'notify-send',
        ShowTime: 10000,
        IconSuccess: '',
        IconFails: '',
        CriticalUrgencyForFails: false,
    };
    let CustomNotifyProviderArguments;
    (function (CustomNotifyProviderArguments) {
        CustomNotifyProviderArguments["messageOnly"] = "messageOnly";
        CustomNotifyProviderArguments["titleThenMessage"] = "titleThenMessage";
        CustomNotifyProviderArguments["messageThenTitle"] = "messageThenTitle";
    })(CustomNotifyProviderArguments = Config.CustomNotifyProviderArguments || (Config.CustomNotifyProviderArguments = {}));
    Config.DEFAULT_CUSTOM_NOTIFY_PROVIDER = {
        ProviderCommand: '',
        Arguments: CustomNotifyProviderArguments.messageOnly,
    };
    let NotifyProvider;
    (function (NotifyProvider) {
        NotifyProvider["Default"] = "Default";
        NotifyProvider["VSCode"] = "VSCode API";
        NotifyProvider["NotifySend"] = "Native Notifications";
        NotifyProvider["VSCodeAndNotifySend"] = "VSCode API/Native Notifications";
        NotifyProvider["CustomProvider"] = "Custom provider";
        NotifyProvider["CustomProviderAndNotifySend"] = "Custom provider/Native Notifications";
    })(NotifyProvider = Config.NotifyProvider || (Config.NotifyProvider = {}));
    Config.DEFAULT_GLOBAL = {
        openOutput: true,
        outputView: 'CMake/Build',
        notifyFails: true,
        notifySuccess: true,
        notifyProvider: NotifyProvider.Default,
        notifySend: Config.DEFAULT_NOTIFY_SEND,
        customNotifyProvider: Config.DEFAULT_CUSTOM_NOTIFY_PROVIDER,
        cmakeExtensionName: 'ms-vscode.cmake-tools',
    };
    function read() {
        const config = vscode.workspace.getConfiguration();
        return config.get(api_1.CMakeToolsBuildWrapper.EXTENSION_NAME, Config.DEFAULT_GLOBAL);
    }
    Config.read = read;
})(Config || (exports.Config = Config = {}));
//# sourceMappingURL=config.js.map