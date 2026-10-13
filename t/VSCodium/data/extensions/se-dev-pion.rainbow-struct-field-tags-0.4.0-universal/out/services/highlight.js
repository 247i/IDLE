"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addHighlight = addHighlight;
const vscode_1 = __importDefault(require("vscode"));
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const decorate_1 = require("../logics/decorate");
function addHighlight(context) {
    let updateDecorations = loadDecorator(loadConfigs(context));
    updateDecorations();
    context.subscriptions.push(vscode_1.default.workspace.onDidOpenTextDocument(updateDecorations), vscode_1.default.workspace.onDidChangeTextDocument(updateDecorations), vscode_1.default.workspace.onDidChangeConfiguration(() => {
        updateDecorations = loadDecorator(loadConfigs(context));
        updateDecorations();
    }), vscode_1.default.window.onDidChangeActiveTextEditor(updateDecorations), vscode_1.default.window.onDidChangeVisibleTextEditors(updateDecorations), vscode_1.default.window.onDidChangeTextEditorVisibleRanges(updateDecorations));
}
function loadConfigs(context) {
    const gormTagKey = vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configGormTagKey);
    // The style created earlier has higher priority
    const keyStyle = vscode_1.default.window.createTextEditorDecorationType({
        color: vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configKeyColor)
    });
    context.subscriptions.push(keyStyle);
    const itemStyle = vscode_1.default.window.createTextEditorDecorationType({
        color: vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configValueItemColor)
    });
    context.subscriptions.push(itemStyle);
    const gapStyle = vscode_1.default.window.createTextEditorDecorationType({
        color: vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configValueGapColor)
    });
    context.subscriptions.push(gapStyle);
    const optionStyle = vscode_1.default.window.createTextEditorDecorationType({
        color: vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configValueOptionColor)
    });
    context.subscriptions.push(optionStyle);
    const branchStyle = vscode_1.default.window.createTextEditorDecorationType({
        color: vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configOptionBranchColor)
    });
    context.subscriptions.push(branchStyle);
    const tagStyle = vscode_1.default.window.createTextEditorDecorationType({
        color: vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configTextColor),
        backgroundColor: vscode_1.default.workspace
            .getConfiguration(constants_1.configKey)
            .get(constants_1.configBackgroundColor)
    });
    context.subscriptions.push(tagStyle);
    const delay = vscode_1.default.workspace.getConfiguration(constants_1.configKey).get(constants_1.configDebounceTimeout) ?? 0;
    return {
        gormTagKey,
        keyStyle,
        itemStyle,
        gapStyle,
        optionStyle,
        branchStyle,
        tagStyle,
        delay
    };
}
function loadDecorator(config) {
    const { keyStyle, itemStyle, optionStyle, branchStyle, gapStyle, tagStyle, gormTagKey, delay } = config;
    return (0, utils_1.debounced)(async () => {
        const editor = vscode_1.default.window.activeTextEditor;
        // [SkipWithoutActiveEditor]
        if (!editor) {
            return;
        } // [/]
        // [SkipUnsupportedLanguages]
        if (!(0, utils_1.isSupportedLanguage)(editor.document.languageId)) {
            return;
        } // [/]
        const { tagRanges, keyRanges, itemRanges, optionRanges, branchRanges, gapRanges } = (0, decorate_1.divideDecoratedBlocks)(editor.document, gormTagKey);
        // [ApplyDecorations]
        editor.setDecorations(tagStyle, tagRanges);
        editor.setDecorations(keyStyle, keyRanges);
        editor.setDecorations(itemStyle, itemRanges);
        editor.setDecorations(optionStyle, optionRanges);
        editor.setDecorations(branchStyle, branchRanges);
        editor.setDecorations(gapStyle, gapRanges); // [/]
    }, delay);
}
//# sourceMappingURL=highlight.js.map