"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gormIndexTagKeys = exports.gormTagItemCommentKey = exports.singleLineStringSign = exports.multiLineAnnotationEnd = exports.multiLineAnnotationStart = exports.singleLineAnnotationSign = exports.configDebounceTimeout = exports.configGormTagKey = exports.configTextColor = exports.configBackgroundColor = exports.configValueGapColor = exports.configOptionBranchColor = exports.configValueOptionColor = exports.configValueItemColor = exports.configKeyColor = exports.configKey = exports.backQuote = exports.doubleQuote = exports.equals = exports.semiColon = exports.colon = exports.comma = exports.regexpMatchTags = exports.supportedLanguages = exports.langGoctl = exports.langGolang = void 0;
exports.langGolang = 'go';
exports.langGoctl = 'goctl';
exports.supportedLanguages = [exports.langGolang, exports.langGoctl];
exports.regexpMatchTags = /([a-zA-Z_]+[a-zA-Z0-9_]*|})\s*[^(/\*.*\*/)|=]*\s*`.+`/;
// [TagStringSeparators]
exports.comma = ',';
exports.colon = ':';
exports.semiColon = ';';
exports.equals = '=';
exports.doubleQuote = '"';
exports.backQuote = '`'; // [/]
// [ConfigurationKeys]
exports.configKey = 'rainbow-struct-field-tags';
exports.configKeyColor = 'key-color';
exports.configValueItemColor = 'value-item-color';
exports.configValueOptionColor = 'value-option-color';
exports.configOptionBranchColor = 'option-branch-color';
exports.configValueGapColor = 'value-gap-color';
exports.configBackgroundColor = 'background-color';
exports.configTextColor = 'text-color';
exports.configGormTagKey = 'gorm-tag-key';
exports.configDebounceTimeout = 'debounce-timeout'; // [/]
// [GrammerMarkers]
exports.singleLineAnnotationSign = '//';
exports.multiLineAnnotationStart = '/*';
exports.multiLineAnnotationEnd = '*/';
exports.singleLineStringSign = '"'; // [/]
// [GormRelatedConstants]
exports.gormTagItemCommentKey = 'comment';
exports.gormIndexTagKeys = ['index', 'uniqueIndex']; // [/]
//# sourceMappingURL=constants.js.map