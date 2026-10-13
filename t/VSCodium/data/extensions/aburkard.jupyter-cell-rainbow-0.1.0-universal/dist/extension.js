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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const NOTEBOOK_CELL_SCHEME = 'vscode-notebook-cell';
let decorationTypes = [];
function activate(context) {
    rebuild();
    context.subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => applyAll()), vscode.workspace.onDidChangeNotebookDocument(e => applyToNotebook(e.notebook)), vscode.window.onDidChangeActiveNotebookEditor(() => applyAll()), vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('jupyterCellRainbow')) {
            rebuild();
        }
    }), vscode.commands.registerCommand('jupyterCellRainbow.toggle', async () => {
        const cfg = vscode.workspace.getConfiguration('jupyterCellRainbow');
        const next = !cfg.get('enabled', true);
        await cfg.update('enabled', next, vscode.ConfigurationTarget.Global);
    }), vscode.commands.registerCommand('jupyterCellRainbow.refresh', () => rebuild()), vscode.commands.registerCommand('jupyterCellRainbow.pickPalette', pickPalette), { dispose: disposeAll });
}
function deactivate() {
    disposeAll();
}
function readConfig() {
    const cfg = vscode.workspace.getConfiguration('jupyterCellRainbow');
    return {
        enabled: cfg.get('enabled', true),
        palette: cfg.get('palette', 'rainbow'),
        customColors: cfg.get('customColors', []),
        opacity: clamp(cfg.get('opacity', 0.12), 0, 1),
        cycleLength: Math.max(2, Math.floor(cfg.get('cycleLength', 12))),
    };
}
function rebuild() {
    disposeAll();
    const cfg = readConfig();
    if (!cfg.enabled) {
        return;
    }
    decorationTypes = buildDecorationTypes(cfg);
    applyAll();
}
function disposeAll() {
    for (const d of decorationTypes) {
        d.dispose();
    }
    decorationTypes = [];
}
function applyAll() {
    for (const editor of vscode.window.visibleTextEditors) {
        applyToEditor(editor);
    }
}
function applyToNotebook(notebook) {
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.uri.scheme !== NOTEBOOK_CELL_SCHEME) {
            continue;
        }
        if (cellNotebook(editor.document)?.uri.toString() === notebook.uri.toString()) {
            applyToEditor(editor);
        }
    }
}
function applyToEditor(editor) {
    if (editor.document.uri.scheme !== NOTEBOOK_CELL_SCHEME) {
        return;
    }
    if (decorationTypes.length === 0) {
        return;
    }
    const index = cellIndex(editor.document);
    if (index < 0) {
        return;
    }
    const wholeRange = new vscode.Range(0, 0, editor.document.lineCount, 0);
    for (let i = 0; i < decorationTypes.length; i++) {
        if (i === index % decorationTypes.length) {
            editor.setDecorations(decorationTypes[i], [wholeRange]);
        }
        else {
            editor.setDecorations(decorationTypes[i], []);
        }
    }
}
function cellNotebook(document) {
    for (const notebook of vscode.workspace.notebookDocuments) {
        if (notebook.getCells().some(cell => cell.document === document)) {
            return notebook;
        }
    }
    return undefined;
}
function cellIndex(document) {
    for (const notebook of vscode.workspace.notebookDocuments) {
        const cells = notebook.getCells();
        const idx = cells.findIndex(cell => cell.document === document);
        if (idx >= 0) {
            return idx;
        }
    }
    return -1;
}
function buildDecorationTypes(cfg) {
    const colors = paletteColors(cfg);
    return colors.map(hex => vscode.window.createTextEditorDecorationType({
        backgroundColor: withAlpha(hex, cfg.opacity),
        isWholeLine: true,
        overviewRulerColor: hex,
        overviewRulerLane: vscode.OverviewRulerLane.Full,
    }));
}
function paletteColors(cfg) {
    if (cfg.palette === 'custom') {
        const cleaned = cfg.customColors
            .map(c => normalizeHex(c))
            .filter((c) => !!c);
        return cleaned.length > 0 ? cleaned : defaultPalette('rainbow', cfg.cycleLength);
    }
    return defaultPalette(cfg.palette, cfg.cycleLength);
}
function defaultPalette(name, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
        const t = i / n;
        switch (name) {
            case 'rainbow':
                out.push(hslToHex(t * 360, 65, 55));
                break;
            case 'pastel':
                out.push(hslToHex(t * 360, 55, 75));
                break;
            case 'ocean':
                out.push(hslToHex(160 + t * 80, 55, 55));
                break;
            case 'warm':
                out.push(hslToHex(t * 60, 70, 55));
                break;
            default:
                out.push(hslToHex(t * 360, 65, 55));
        }
    }
    return out;
}
function hslToHex(h, s, l) {
    const sN = s / 100;
    const lN = l / 100;
    const c = (1 - Math.abs(2 * lN - 1)) * sN;
    const hP = ((h % 360) + 360) % 360 / 60;
    const x = c * (1 - Math.abs((hP % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hP < 1) {
        r = c;
        g = x;
        b = 0;
    }
    else if (hP < 2) {
        r = x;
        g = c;
        b = 0;
    }
    else if (hP < 3) {
        r = 0;
        g = c;
        b = x;
    }
    else if (hP < 4) {
        r = 0;
        g = x;
        b = c;
    }
    else if (hP < 5) {
        r = x;
        g = 0;
        b = c;
    }
    else {
        r = c;
        g = 0;
        b = x;
    }
    const m = lN - c / 2;
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
function rgbToHex(r, g, b) {
    const h = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}
function normalizeHex(raw) {
    const v = raw.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v))
        return v.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
        const chars = v.slice(1).split('');
        return `#${chars.map(c => c + c).join('').toLowerCase()}`;
    }
    return undefined;
}
function withAlpha(hex, alpha) {
    const n = normalizeHex(hex);
    if (!n)
        return `rgba(128,128,128,${alpha})`;
    const r = parseInt(n.slice(1, 3), 16);
    const g = parseInt(n.slice(3, 5), 16);
    const b = parseInt(n.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
async function pickPalette() {
    const current = readConfig().palette;
    const items = [
        { value: 'rainbow', label: 'Rainbow', description: 'Full hue cycle' },
        { value: 'pastel', label: 'Pastel', description: 'Soft, high-lightness' },
        { value: 'ocean', label: 'Ocean', description: 'Blues and greens' },
        { value: 'warm', label: 'Warm', description: 'Reds, oranges, yellows' },
        { value: 'custom', label: 'Custom', description: 'Use jupyterCellRainbow.customColors' },
    ];
    for (const it of items) {
        if (it.value === current)
            it.label = `$(check) ${it.label}`;
    }
    const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Pick a palette',
        matchOnDescription: true,
    });
    if (pick) {
        await vscode.workspace.getConfiguration('jupyterCellRainbow')
            .update('palette', pick.value, vscode.ConfigurationTarget.Global);
    }
}
//# sourceMappingURL=extension.js.map