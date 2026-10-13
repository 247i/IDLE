"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const SUPPORTED_LANGUAGES = new Set(['c', 'cpp']);
const CONFIG_SECTION = 'preprocessorRainbow';
// Matches a preprocessor directive at the start of a line (ignoring leading
// whitespace, since some codebases indent directives).
const IF_RE = /^\s*#\s*(if|ifdef|ifndef)\b/;
const MID_RE = /^\s*#\s*(else|elif|elifdef|elifndef)\b/;
const ENDIF_RE = /^\s*#\s*endif\b/;
let decorationTypes = [];
let statusBarItem;
let enabled = true;
function activate(context) {
    const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
    enabled = cfg.get('enabled', true);
    buildDecorationTypes();
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = `${CONFIG_SECTION}.toggle`;
    context.subscriptions.push(statusBarItem);
    updateStatusBar();
    context.subscriptions.push(vscode.commands.registerCommand(`${CONFIG_SECTION}.toggle`, async () => {
        enabled = !enabled;
        await vscode.workspace
            .getConfiguration(CONFIG_SECTION)
            .update('enabled', enabled, vscode.ConfigurationTarget.Global);
        updateStatusBar();
        updateAllVisibleEditors();
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        updateStatusBar();
        if (vscode.window.activeTextEditor) {
            updateEditor(vscode.window.activeTextEditor);
        }
    }));
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => updateAllVisibleEditors()));
    let debounce;
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || e.document !== editor.document) {
            return;
        }
        if (debounce) {
            clearTimeout(debounce);
        }
        debounce = setTimeout(() => updateEditor(editor), 150);
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration(CONFIG_SECTION)) {
            return;
        }
        enabled = vscode.workspace
            .getConfiguration(CONFIG_SECTION)
            .get('enabled', true);
        buildDecorationTypes();
        updateStatusBar();
        updateAllVisibleEditors();
    }));
    updateAllVisibleEditors();
}
function deactivate() {
    disposeDecorationTypes();
}
function disposeDecorationTypes() {
    for (const d of decorationTypes) {
        d.dispose();
    }
    decorationTypes = [];
}
function buildDecorationTypes() {
    disposeDecorationTypes();
    const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const colors = cfg.get('colors', []);
    const alphas = cfg.get('alphas', []);
    decorationTypes = colors.map((color, i) => {
        const alpha = alphas.length
            ? alphas[Math.min(i, alphas.length - 1)]
            : 0.12;
        return vscode.window.createTextEditorDecorationType({
            backgroundColor: hexToRgba(color, alpha),
            isWholeLine: true,
            rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen,
        });
    });
}
function hexToRgba(hex, alpha) {
    const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
    if (!m) {
        // Fall back to a neutral gray if a color is malformed.
        return `rgba(128,128,128,${clampAlpha(alpha)})`;
    }
    let h = m[1];
    if (h.length === 3) {
        h = h
            .split('')
            .map((c) => c + c)
            .join('');
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${clampAlpha(alpha)})`;
}
function clampAlpha(a) {
    if (Number.isNaN(a)) {
        return 0.12;
    }
    return Math.max(0, Math.min(1, a));
}
function updateAllVisibleEditors() {
    for (const editor of vscode.window.visibleTextEditors) {
        updateEditor(editor);
    }
}
function updateStatusBar() {
    const editor = vscode.window.activeTextEditor;
    const isSupported = !!editor && SUPPORTED_LANGUAGES.has(editor.document.languageId);
    if (!isSupported) {
        statusBarItem.hide();
        return;
    }
    statusBarItem.text = enabled
        ? '$(symbol-color) Preproc Rainbow: On'
        : '$(circle-slash) Preproc Rainbow: Off';
    statusBarItem.tooltip = 'Toggle preprocessor block highlighting';
    statusBarItem.show();
}
function updateEditor(editor) {
    if (decorationTypes.length === 0) {
        return;
    }
    const supported = SUPPORTED_LANGUAGES.has(editor.document.languageId);
    // Always clear first so disabling / unsupported files don't keep stale paint.
    if (!enabled || !supported) {
        for (const d of decorationTypes) {
            editor.setDecorations(d, []);
        }
        return;
    }
    const ranges = computeRanges(editor.document);
    for (let i = 0; i < decorationTypes.length; i++) {
        editor.setDecorations(decorationTypes[i], ranges[i] ?? []);
    }
}
/**
 * Walks the document tracking #if/#endif nesting and returns, for each
 * decoration layer index, the list of ranges to paint. Layer index is
 * (depth - 1) modulo the number of decoration types, so colors loop.
 */
function computeRanges(document) {
    const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
    const maxDepth = cfg.get('maxDepth', 24);
    const layerCount = decorationTypes.length;
    const result = Array.from({ length: layerCount }, () => []);
    // Stack holds the line number where each currently-open #if started.
    const stack = [];
    for (let line = 0; line < document.lineCount; line++) {
        const text = document.lineAt(line).text;
        if (IF_RE.test(text)) {
            stack.push(line);
            continue;
        }
        if (ENDIF_RE.test(text)) {
            const startLine = stack.pop();
            if (startLine === undefined) {
                continue; // Unbalanced #endif; skip gracefully.
            }
            const depth = stack.length + 1; // depth this block occupied
            if (depth <= maxDepth) {
                const layer = (depth - 1) % layerCount;
                result[layer].push(new vscode.Range(startLine, 0, line, document.lineAt(line).text.length));
            }
            continue;
        }
        // #else / #elif do not change nesting depth; nothing to do.
        void MID_RE;
    }
    return result;
}
//# sourceMappingURL=extension.js.map