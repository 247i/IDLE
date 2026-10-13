"use strict";
exports.id = 1;
exports.ids = [1];
exports.modules = {

/***/ 1099:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.normalizeThemeColor = normalizeThemeColor;
exports.resolveThemeTokenColors = resolveThemeTokenColors;
exports.getActiveThemeTokenColors = getActiveThemeTokenColors;
const fs = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(3));
const vscode = __importStar(__webpack_require__(4));
const jsonc_parser_1 = __webpack_require__(50);
const semanticColorsService_1 = __webpack_require__(767);
/** Candidate C# TextMate scopes per color, in priority order; the first one with a matching theme rule wins. */
const textMateCandidates = {
    plainText: [],
    keyword: ['keyword.other.cs', 'storage.modifier.cs', 'storage.type.cs'],
    controlKeyword: ['keyword.control.flow.cs', 'keyword.control.cs'],
    class: ['entity.name.type.class.cs', 'entity.name.type.cs', 'entity.name.class', 'support.class.cs'],
    struct: ['entity.name.type.struct.cs', 'entity.name.type.cs', 'entity.name.class'],
    interface: ['entity.name.type.interface.cs', 'entity.name.type.cs', 'entity.name.class'],
    enum: ['entity.name.type.enum.cs', 'entity.name.type.cs', 'entity.name.class'],
    delegate: ['entity.name.type.delegate.cs', 'entity.name.type.cs', 'entity.name.class'],
    typeParameter: ['entity.name.type.type-parameter.cs', 'entity.name.type.cs', 'entity.name.class'],
    namespace: ['entity.name.type.namespace.cs', 'entity.name.namespace.cs'],
    method: ['entity.name.function.cs', 'support.function.cs'],
    property: ['variable.other.object.property.cs', 'variable.other.property.cs'],
    field: ['variable.other.field.cs', 'variable.other.readwrite.cs'],
    event: ['variable.other.event.cs'],
    constant: ['variable.other.constant.cs', 'constant.other.cs'],
    enumMember: ['variable.other.enummember.cs', 'constant.other.enum.cs'],
    variable: ['variable.other.local.cs', 'variable.other.readwrite.cs'],
    parameter: ['variable.parameter.cs'],
    operator: ['keyword.operator.cs'],
    string: ['string.quoted.double.cs'],
    stringVerbatim: ['string.quoted.double.cs'],
    number: ['constant.numeric.decimal.cs', 'constant.numeric.cs'],
    comment: ['comment.line.double-slash.cs', 'comment.cs'],
    xmlDocComment: ['comment.block.documentation.cs', 'comment.line.double-slash.documentation.cs', 'comment.cs'],
    preprocessor: ['keyword.preprocessor.cs', 'meta.preprocessor.cs'],
    inactive: [],
};
const semanticSuperTypes = {
    class: ['type'],
    struct: ['type'],
    interface: ['type'],
    enum: ['type'],
    delegate: ['type'],
    typeParameter: ['type'],
};
const simpleTokenColorScopes = {
    comments: ['comment', 'punctuation.definition.comment'],
    strings: ['string'],
    keywords: ['keyword', 'keyword.control', 'storage', 'storage.type'],
    numbers: ['constant.numeric'],
    types: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
    functions: ['entity.name.function', 'support.function'],
    variables: ['variable', 'entity.name.variable'],
};
const ROOT_SCOPE = 'source.cs';
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function normalizeThemeColor(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim());
    if (!match) {
        return undefined;
    }
    const hex = match[1].length <= 4
        ? match[1].split('').map((char) => char + char).join('')
        : match[1];
    return `#${hex.slice(0, 6).toUpperCase()}`;
}
function scopeMatches(selector, scope) {
    return scope === selector || scope.startsWith(`${selector}.`);
}
function prepareRules(rules) {
    const prepared = [];
    let defaultForeground;
    for (const rule of rules) {
        const foreground = normalizeThemeColor(rule?.settings?.foreground);
        if (!foreground) {
            continue;
        }
        const scopes = (Array.isArray(rule.scope) ? rule.scope : [rule.scope ?? ''])
            .filter((scope) => typeof scope === 'string')
            .flatMap((scope) => scope.split(','))
            .map((scope) => scope.trim())
            .filter(Boolean);
        if (scopes.length === 0) {
            defaultForeground = foreground;
            continue;
        }
        const selectors = scopes
            .map((scope) => scope.split(/\s+/))
            .filter((parts) => !parts.some((part) => /^[-|&]$|[()]/.test(part)));
        if (selectors.length > 0) {
            prepared.push({ selectors, foreground });
        }
    }
    return { rules: prepared, defaultForeground };
}
function findTextMateForeground(rules, scope) {
    let best;
    let bestScore = -1;
    for (const rule of rules) {
        for (const selector of rule.selectors) {
            const last = selector[selector.length - 1];
            const parentsMatch = selector.slice(0, -1).every((part) => scopeMatches(part, ROOT_SCOPE));
            if (!parentsMatch || !scopeMatches(last, scope)) {
                continue;
            }
            const score = last.length + selector.length * 1000;
            if (score >= bestScore) {
                best = rule.foreground;
                bestScore = score;
            }
        }
    }
    return best;
}
function buildSemanticColorMap(rules) {
    const colors = new Map();
    for (const source of rules) {
        for (const [selector, value] of Object.entries(source)) {
            const [type, language, ...rest] = selector.split(':');
            if (rest.length > 0 || (language !== undefined && language !== 'csharp') || /[.*]/.test(type)) {
                continue;
            }
            const color = normalizeThemeColor(isRecord(value) ? value.foreground : value);
            if (color) {
                colors.set(type, color);
            }
        }
    }
    return colors;
}
/** Resolves the C# token colors a theme (plus user customizations) would produce in VS Code. */
function resolveThemeTokenColors(theme, customTextMateRules, customSemanticRules, semanticEnabled, fallback) {
    const { rules, defaultForeground } = prepareRules([...theme.tokenColors, ...customTextMateRules]);
    const semanticColors = semanticEnabled
        ? buildSemanticColorMap([theme.semanticTokenColors, customSemanticRules])
        : new Map();
    const plainText = normalizeThemeColor(theme.editorForeground) ?? defaultForeground ?? fallback.plainText;
    const resolved = { ...fallback, plainText };
    for (const { key } of semanticColorsService_1.semanticColorFields) {
        if (key === 'plainText' || key === 'inactive') {
            continue;
        }
        const semanticTypes = [...(semanticColorsService_1.semanticTokenSelectors[key] ?? []), ...(semanticSuperTypes[key] ?? [])];
        const semantic = semanticTypes.map((type) => semanticColors.get(type)).find(Boolean);
        const textMate = textMateCandidates[key]
            .map((scope) => findTextMateForeground(rules, scope))
            .find(Boolean);
        resolved[key] = semantic ?? textMate ?? plainText;
    }
    return resolved;
}
function findActiveThemeContribution() {
    const workbench = vscode.workspace.getConfiguration('workbench');
    let themeName = workbench.get('colorTheme');
    if (vscode.workspace.getConfiguration('window').get('autoDetectColorScheme')) {
        const kind = vscode.window.activeColorTheme.kind;
        const preferred = kind === vscode.ColorThemeKind.Light
            ? workbench.get('preferredLightColorTheme')
            : kind === vscode.ColorThemeKind.Dark ? workbench.get('preferredDarkColorTheme') : undefined;
        themeName = preferred || themeName;
    }
    if (!themeName) {
        return undefined;
    }
    for (const extension of vscode.extensions.all) {
        const themes = extension.packageJSON
            .contributes?.themes;
        const contribution = themes?.find((item) => item.path && (item.id === themeName || item.label === themeName));
        if (contribution?.path) {
            return {
                names: [contribution.id, contribution.label, themeName].filter((name) => !!name),
                file: path.resolve(extension.extensionPath, contribution.path),
            };
        }
    }
    return undefined;
}
function loadThemeFile(file, visited) {
    const empty = { tokenColors: [], semanticTokenColors: {} };
    const resolvedFile = path.resolve(file);
    if (visited.has(resolvedFile) || !fs.existsSync(resolvedFile)) {
        return empty;
    }
    visited.add(resolvedFile);
    const raw = (0, jsonc_parser_1.parse)(fs.readFileSync(resolvedFile, 'utf8'), [], { allowTrailingComma: true });
    if (!isRecord(raw)) {
        return empty;
    }
    const baseDir = path.dirname(resolvedFile);
    const base = typeof raw.include === 'string'
        ? loadThemeFile(path.resolve(baseDir, raw.include), visited)
        : empty;
    let ownTokenColors = [];
    if (Array.isArray(raw.tokenColors)) {
        ownTokenColors = raw.tokenColors;
    }
    else if (typeof raw.tokenColors === 'string' && raw.tokenColors.toLowerCase().endsWith('.json')) {
        ownTokenColors = loadThemeFile(path.resolve(baseDir, raw.tokenColors), visited).tokenColors;
    }
    const colors = isRecord(raw.colors) ? raw.colors : {};
    return {
        tokenColors: [...base.tokenColors, ...ownTokenColors],
        semanticTokenColors: {
            ...base.semanticTokenColors,
            ...(isRecord(raw.semanticTokenColors) ? raw.semanticTokenColors : {}),
        },
        semanticHighlighting: typeof raw.semanticHighlighting === 'boolean'
            ? raw.semanticHighlighting
            : base.semanticHighlighting,
        editorForeground: typeof colors['editor.foreground'] === 'string'
            ? colors['editor.foreground']
            : base.editorForeground,
    };
}
/** Customization objects that apply globally plus those scoped to the active theme (`[Theme Name]` keys). */
function getApplicableCustomizations(value, themeNames) {
    if (!isRecord(value)) {
        return [];
    }
    const scoped = Object.entries(value)
        .filter(([key, scopedValue]) => isRecord(scopedValue) &&
        (key.match(/\[[^\]]+\]/g) ?? []).some((part) => themeNames.includes(part.slice(1, -1))))
        .map(([, scopedValue]) => scopedValue);
    return [value, ...scoped];
}
function getCustomTextMateRules(customizations) {
    const rules = [];
    for (const customization of customizations) {
        for (const [key, scopes] of Object.entries(simpleTokenColorScopes)) {
            const setting = customization[key];
            const foreground = normalizeThemeColor(isRecord(setting) ? setting.foreground : setting);
            if (foreground) {
                rules.push({ scope: scopes, settings: { foreground } });
            }
        }
        if (Array.isArray(customization.textMateRules)) {
            rules.push(...customization.textMateRules);
        }
    }
    return rules;
}
/**
 * Colors VS Code renders for C# with the active color theme and the user's token color customizations,
 * or undefined when the active theme cannot be located.
 */
function getActiveThemeTokenColors() {
    try {
        const active = findActiveThemeContribution();
        if (!active) {
            return undefined;
        }
        const theme = loadThemeFile(active.file, new Set());
        const config = vscode.workspace.getConfiguration();
        const textMateCustomizations = getApplicableCustomizations(config.get('editor.tokenColorCustomizations'), active.names);
        const semanticCustomizations = getApplicableCustomizations(config.get('editor.semanticTokenColorCustomizations'), active.names);
        let semanticSetting = config.get('editor.semanticHighlighting.enabled', 'configuredByTheme');
        for (const customization of semanticCustomizations) {
            if (typeof customization.enabled === 'boolean') {
                semanticSetting = customization.enabled;
            }
        }
        const semanticEnabled = semanticSetting === true ||
            (semanticSetting === 'configuredByTheme' && theme.semanticHighlighting === true);
        const customSemanticRules = Object.assign({}, ...semanticCustomizations.map((customization) => isRecord(customization.rules) ? customization.rules : {}));
        return resolveThemeTokenColors(theme, getCustomTextMateRules(textMateCustomizations), customSemanticRules, semanticEnabled, (0, semanticColorsService_1.getSemanticColorPalette)('visualStudio', (0, semanticColorsService_1.getActiveSemanticColorVariant)()));
    }
    catch (error) {
        console.warn('Failed to resolve the active VS Code theme token colors:', error);
        return undefined;
    }
}


/***/ })

};
;
//# sourceMappingURL=1.extension.js.map