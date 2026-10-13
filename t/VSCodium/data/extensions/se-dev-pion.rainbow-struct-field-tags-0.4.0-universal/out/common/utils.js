"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounced = debounced;
exports.createState = createState;
exports.overlapWithMultiLineAnnotationAreas = overlapWithMultiLineAnnotationAreas;
exports.scanMultiLineAnnotations = scanMultiLineAnnotations;
exports.isSupportedLanguage = isSupportedLanguage;
const vscode_1 = __importDefault(require("vscode"));
const constants_1 = require("./constants");
function debounced(func, wait) {
    let timeout = null;
    const f = (...args) => {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
    return f;
}
function createState(originValue, defaultValue) {
    let value = originValue;
    return {
        get: () => value,
        set: (newValue) => {
            value = newValue;
        },
        reset: () => {
            value = defaultValue;
        },
        init: () => value !== defaultValue
    };
}
function overlapWithMultiLineAnnotationAreas(annotationAreas, matchArea) {
    if (annotationAreas.length === 0) {
        return [];
    }
    let annotationArea;
    const overlaps = new Array();
    for (annotationArea of annotationAreas) {
        if (annotationArea.start.isAfter(matchArea.end)) {
            break;
        }
        const overlap = annotationArea.intersection(matchArea);
        if (overlap) {
            overlaps.push(overlap);
        }
    }
    return overlaps;
}
function scanMultiLineAnnotations(document, offset, end, areas) {
    let areaStart = document.getText().slice(offset).indexOf(constants_1.multiLineAnnotationStart);
    if (areaStart !== -1) {
        areaStart += offset;
        const offsetWithOutHead = areaStart + 2;
        let areaEnd = document.getText().slice(offsetWithOutHead).indexOf(constants_1.multiLineAnnotationEnd);
        areaEnd = Math.min(end, areaEnd === -1 ? end : areaEnd + offsetWithOutHead + 2);
        areas.push(new vscode_1.default.Range(document.positionAt(areaStart), document.positionAt(areaEnd)));
        scanMultiLineAnnotations(document, areaEnd, end, areas);
    }
    return areas;
}
function isSupportedLanguage(lang) {
    return constants_1.supportedLanguages.includes(lang);
}
//# sourceMappingURL=utils.js.map