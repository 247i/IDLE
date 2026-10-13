"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.divideDecoratedBlocks = divideDecoratedBlocks;
const vscode_1 = __importDefault(require("vscode"));
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
function divideDecoratedBlocks(document, gormTagKey) {
    // [Preparations]
    const tagRanges = new Array();
    const keyRanges = new Array();
    const itemRanges = new Array();
    const optionRanges = new Array();
    const branchRanges = new Array();
    const gapRanges = new Array();
    const lines = document.getText().split('\n');
    const multiLineAnnotationAreas = (0, utils_1.scanMultiLineAnnotations)(document, 0, document.getText().length - 1, new Array()); // [/]
    for (let i = 0; i < lines.length; i++) {
        // [SkipNoMatchingLines]
        const line = lines[i];
        if (!constants_1.regexpMatchTags.test(line)) {
            continue;
        } // [/]
        // [SkipMultiLineAnnotations]
        let matchStr = constants_1.regexpMatchTags.exec(line)[0];
        const start = line.indexOf(matchStr);
        const end = start + matchStr.length - 1;
        const matchArea = new vscode_1.default.Range(new vscode_1.default.Position(i, start), new vscode_1.default.Position(i, end));
        const overlapAreas = (0, utils_1.overlapWithMultiLineAnnotationAreas)(multiLineAnnotationAreas, matchArea);
        for (const area of overlapAreas) {
            matchStr = matchStr.replace(document.getText(area), '');
        }
        if (!constants_1.regexpMatchTags.test(matchStr)) {
            continue;
        } // [/]
        // [SkipSingleLineAnnotationsAndSingleLineStrings]
        const tagLeftBorder = line.indexOf(constants_1.backQuote);
        const prefix = line.slice(0, tagLeftBorder);
        if (prefix.includes(constants_1.singleLineAnnotationSign) || prefix.includes(constants_1.singleLineStringSign)) {
            continue;
        } // [/]
        // [RecordTagStringRange]
        const tagStart = tagLeftBorder + 1;
        const tagEnd = line.lastIndexOf(constants_1.backQuote);
        recordRange(tagRanges, i, tagLeftBorder, tagEnd + 1); // [/]
        // [KeyRangeRecorder]
        const keyStart = (0, utils_1.createState)(tagStart, -1);
        const recordKeyRange = buildRangeRecorder(keyRanges, i, keyStart); // [/]
        // [ItemRangeRecorder]
        const itemStart = (0, utils_1.createState)(-1, -1);
        const recordItemRange = buildRangeRecorder(itemRanges, i, itemStart); // [/]
        // [OptionRangeRecorder]
        const optionStart = (0, utils_1.createState)(-1, -1);
        const recordOptionRange = buildRangeRecorder(optionRanges, i, optionStart); // [/]
        // [BranchRangeRecorder]
        const branchStart = (0, utils_1.createState)(-1, -1);
        const recordBranchRange = buildRangeRecorder(branchRanges, i, branchStart); // [/]
        // [ValueRangeRecorder]
        const recordValueRange = (end) => {
            if (branchStart.init()) {
                recordBranchRange(end);
            }
            else if (optionStart.init()) {
                recordOptionRange(end);
            }
            else if (itemStart.init()) {
                recordItemRange(end);
            }
        }; // [/]
        // [GapRangeRecorder]
        const recordGapRange = (end) => {
            recordRange(gapRanges, i, end, end + 1);
        }; // [/]
        let [inValue, inGormTag, inGormComment, inGormIndex] = new Array(4).fill(false);
        for (let j = tagStart; j < tagEnd; j++) {
            const char = line[j];
            // [RecordKeyRange]
            if (!inValue && char === constants_1.colon && keyStart.init()) {
                recordKeyRange(j);
            } // [/]
            if (char === constants_1.doubleQuote) {
                // [RecordValueRangeAndSetKeyStart]
                if (inValue) {
                    recordValueRange(j);
                    keyStart.set(j + 1);
                    // [ClearGormContext]
                    inGormTag = false;
                    inGormComment = false;
                    inGormIndex = false; // [/]
                } // [/]
                // [SetItemStart]
                else {
                    itemStart.set(j + 1);
                    // [InitGormContext]
                    const keyRange = keyRanges[keyRanges.length - 1];
                    inGormTag =
                        line.slice(keyRange.start.character, keyRange.end.character).trim() ===
                            gormTagKey; // [/]
                } // [/]
                inValue = !inValue;
            }
            // [SkipHandleCommentTagOfGorm]
            if (inGormComment) {
                continue;
            } // [/]
            if (inGormTag) {
                // [SkipEscapedChar] https://gorm.io/docs/models.html#Fields-Tags
                if (char === '\\') {
                    j++;
                    continue;
                } // [/]
                switch (char) {
                    case constants_1.colon:
                        // https://gorm.io/docs/indexes.html#Index-Tag
                        if (inGormIndex) {
                            recordOptionRange(j);
                            branchStart.set(j + 1);
                        }
                        // https://gorm.io/docs/models.html#Fields-Tags
                        else {
                            recordItemRange(j);
                            optionStart.set(j + 1);
                            // [InitGormSubContext]
                            const itemRange = itemRanges[itemRanges.length - 1];
                            const item = line
                                .slice(itemRange.start.character, itemRange.end.character)
                                .trim();
                            inGormComment = item === constants_1.gormTagItemCommentKey;
                            inGormIndex = constants_1.gormIndexTagKeys.includes(item); // [/]
                        }
                        break;
                    // https://gorm.io/docs/models.html#Fields-Tags
                    case constants_1.semiColon:
                        // [SkipEmptyValue]
                        if (!inValue) {
                            continue;
                        } // [/]
                        recordGapRange(j);
                        recordValueRange(j);
                        itemStart.set(j + 1);
                        inGormIndex = false;
                        break;
                    // https://gorm.io/docs/indexes.html#Index-Tag
                    case constants_1.comma:
                        // [RecordGapBetweenSubTagsOfIndexTag]
                        if (inGormIndex) {
                            recordGapRange(j);
                        } // [/]
                        // [RecordSubTagOfIndexTag]
                        if (branchStart.init()) {
                            recordBranchRange(j);
                            optionStart.set(j + 1);
                        } // [/]
                }
            }
            else {
                switch (char) {
                    case constants_1.equals:
                        if (itemStart.init()) {
                            recordItemRange(j);
                            optionStart.set(j + 1);
                        }
                        break;
                    case constants_1.comma:
                        // [SkipEmptyValue]
                        if (!inValue) {
                            continue;
                        } // [/]
                        recordRange(gapRanges, i, j, j + 1);
                        recordValueRange(j);
                        itemStart.set(j + 1);
                        break;
                }
            }
        }
    }
    return {
        tagRanges,
        keyRanges,
        itemRanges,
        optionRanges,
        branchRanges,
        gapRanges
    };
}
function recordRange(ranges, line, start, end) {
    ranges.push(new vscode_1.default.Range(new vscode_1.default.Position(line, start), new vscode_1.default.Position(line, end)));
}
function buildRangeRecorder(ranges, line, start) {
    return (end) => {
        recordRange(ranges, line, start.get(), end);
        start.reset();
    };
}
//# sourceMappingURL=decorate.js.map