"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.highlightStructFieldTags = highlightStructFieldTags;
const vscode_1 = __importDefault(require("vscode"));
const common_1 = require("./common");
function highlightStructFieldTags(_context) {
    const updateDecorations = () => {
        // [DefineStyles] The style created earlier has higher priority
        const keyStyle = vscode_1.default.window.createTextEditorDecorationType({
            color: vscode_1.default.workspace.getConfiguration(common_1.configKey).get(common_1.configKeyColor),
        });
        const itemStyle = vscode_1.default.window.createTextEditorDecorationType({
            color: vscode_1.default.workspace.getConfiguration(common_1.configKey).get(common_1.configValueItemColor),
        });
        const optionStyle = vscode_1.default.window.createTextEditorDecorationType({
            color: vscode_1.default.workspace.getConfiguration(common_1.configKey).get(common_1.configValueOptionColor),
        });
        const gapColor = vscode_1.default.window.createTextEditorDecorationType({
            color: vscode_1.default.workspace.getConfiguration(common_1.configKey).get(common_1.configValueGapColor),
        });
        const tagStyle = vscode_1.default.window.createTextEditorDecorationType({
            color: vscode_1.default.workspace.getConfiguration(common_1.configKey).get(common_1.configTextColor),
            backgroundColor: vscode_1.default.workspace.getConfiguration(common_1.configKey).get(common_1.configBackgroundColor),
        }); // [/]
        // [CheckActiveEditor]
        const editor = vscode_1.default.window.activeTextEditor;
        if (!editor) {
            return;
        } // [/]
        // [CheckDocumentLanguage]
        const document = editor.document;
        if (document.languageId !== 'go') {
            return;
        } // [/]
        // [Preparations]
        const tagRanges = new Array();
        const keyRanges = new Array();
        const itemRanges = new Array();
        const optionRanges = new Array();
        const gapRanges = new Array();
        const lines = document.getText().split('\n');
        const multiLineAnnotationAreas = scanMultiLineAnnotations(document, 0, document.getText().length - 1, new Array()); // [/]
        for (let i = 0; i < lines.length; i++) {
            // [SkipNoMatchingLines]
            const line = lines[i];
            if (!common_1.regexpMatchTags.test(line)) {
                continue;
            } // [/]
            // [SkipMultiLineAnnotations]
            let matchStr = common_1.regexpMatchTags.exec(line)[0];
            const start = line.indexOf(matchStr);
            const end = start + matchStr.length - 1;
            const matchArea = new vscode_1.default.Range(new vscode_1.default.Position(i, start), new vscode_1.default.Position(i, end));
            const overlapAreas = overlapWithMultiLineAnnotationAreas(multiLineAnnotationAreas, matchArea);
            for (const area of overlapAreas) {
                matchStr = matchStr.replace(document.getText(area), '');
            }
            if (!common_1.regexpMatchTags.test(matchStr)) {
                continue;
            } // [/]
            // [SkipSingleLineAnnotations]
            const tagLeftBorder = line.indexOf(common_1.separators[common_1.tagBorder]);
            if (line.slice(0, tagLeftBorder).includes(common_1.singleLineAnnotationSign)) {
                continue;
            } // [/]
            // [RecordTagStringRange]
            const tagStart = tagLeftBorder + 1;
            const tagEnd = line.lastIndexOf(common_1.separators[common_1.tagBorder]);
            recordRange(tagRanges, i, tagLeftBorder, tagEnd + 1); // [/]
            // [KeyRangeRecorder]
            let keyStart = tagStart;
            const recordKeyRange = (end) => {
                recordRange(keyRanges, i, keyStart, end);
                keyStart = -1;
            }; // [/]
            // [ItemRangeRecorder]
            let itemStart = -1;
            const recordItemRange = (end) => {
                recordRange(itemRanges, i, itemStart, end);
                itemStart = -1;
            }; // [/]
            // [OptionRangeRecorder]
            let optionStart = -1;
            const recordOptionRange = (end) => {
                recordRange(optionRanges, i, optionStart, end);
                optionStart = -1;
            }; // [/]
            // [ValueRangeRecorder]
            const recordValueRange = (end) => {
                if (optionStart !== -1) {
                    recordOptionRange(end);
                }
                else if (itemStart !== -1) {
                    recordItemRange(end);
                }
            }; // [/]
            let [inValue, gormTag] = [false, false];
            for (let j = tagStart; j < tagEnd; j++) {
                const char = line[j];
                // [RecordKeyRange]
                if (!inValue && char === common_1.separators[common_1.keyValueSeparator] && keyStart !== -1) {
                    recordKeyRange(j);
                } // [/]
                if (char === common_1.separators[common_1.valueBorder]) {
                    // [RecordValueRangeAndSetKeyStart]
                    if (inValue) {
                        recordValueRange(j);
                        keyStart = j + 1;
                        gormTag = false;
                    } // [/]
                    // [SetItemStart]
                    else {
                        itemStart = j + 1;
                        const keyRange = keyRanges[keyRanges.length - 1];
                        gormTag = line.slice(keyRange.start.character, keyRange.end.character).trim() === 'gorm';
                    } // [/]
                    inValue = !inValue;
                }
                // [RecordItemRange]
                if ((gormTag && char === common_1.gormSeparators[common_1.itemOptionSeparator]) || (!gormTag && char === common_1.separators[common_1.itemOptionSeparator]) && itemStart !== -1) {
                    recordItemRange(j);
                    optionStart = j + 1;
                } // [/]
                if ((gormTag && char === common_1.gormSeparators[common_1.valueItemsSeparator]) || (!gormTag && char === common_1.separators[common_1.valueItemsSeparator])) {
                    // [SkipEmptyValue]
                    if (!inValue) {
                        continue;
                    } // [/]
                    recordRange(gapRanges, i, j, j + 1);
                    // [RecordOptionRangeAndStartFindingNextOption]
                    if (optionStart !== -1) {
                        recordOptionRange(j);
                    } // [/]
                    // [RecordItemRangeAndStartFindingNextItem]
                    else if (itemStart !== -1) {
                        recordItemRange(j);
                    } // [/]
                    itemStart = j + 1;
                }
            }
        }
        // [ApplyDecorations]
        editor.setDecorations(tagStyle, tagRanges);
        editor.setDecorations(keyStyle, keyRanges);
        editor.setDecorations(itemStyle, itemRanges);
        editor.setDecorations(optionStyle, optionRanges);
        editor.setDecorations(gapColor, gapRanges); // [/]
    };
    updateDecorations();
    // [AddEventListeners]
    vscode_1.default.workspace.onDidOpenTextDocument(updateDecorations);
    vscode_1.default.workspace.onDidChangeTextDocument(updateDecorations);
    vscode_1.default.workspace.onDidChangeConfiguration(updateDecorations);
    vscode_1.default.window.onDidChangeActiveTextEditor(updateDecorations);
    vscode_1.default.window.onDidChangeVisibleTextEditors(updateDecorations);
    vscode_1.default.window.onDidChangeTextEditorVisibleRanges(updateDecorations); // [/]
}
function recordRange(ranges, line, start, end) {
    ranges.push(new vscode_1.default.Range(new vscode_1.default.Position(line, start), new vscode_1.default.Position(line, end)));
}
function scanMultiLineAnnotations(document, offset, end, areas) {
    let areaStart = document.getText().slice(offset).indexOf(common_1.multiLineAnnotationStart);
    if (areaStart !== -1) {
        areaStart += offset;
        const offsetWithOutHead = areaStart + 2;
        let areaEnd = document.getText().slice(offsetWithOutHead).indexOf(common_1.multiLineAnnotationEnd);
        areaEnd = Math.min(end, areaEnd === -1 ? end : areaEnd + offsetWithOutHead + 2);
        areas.push(new vscode_1.default.Range(document.positionAt(areaStart), document.positionAt(areaEnd)));
        scanMultiLineAnnotations(document, areaEnd, end, areas);
    }
    return areas;
}
function overlapWithMultiLineAnnotationAreas(annotationAreas, matchArea) {
    if (annotationAreas.length === 0) {
        return [];
    }
    let annotationArea;
    const overlaps = new Array();
    while (annotationAreas.length > 0) {
        annotationArea = annotationAreas[0];
        if (annotationArea.start.isAfter(matchArea.end)) {
            break;
        }
        const overlap = annotationArea.intersection(matchArea);
        if (overlap) {
            overlaps.push(overlap);
        }
        annotationAreas.shift();
    }
    return overlaps;
}
//# sourceMappingURL=highlight.js.map