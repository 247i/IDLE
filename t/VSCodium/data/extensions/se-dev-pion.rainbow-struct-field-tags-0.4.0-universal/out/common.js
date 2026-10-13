"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiLineAnnotationEnd = exports.multiLineAnnotationStart = exports.singleLineAnnotationSign = exports.configTextColor = exports.configBackgroundColor = exports.configValueGapColor = exports.configValueOptionColor = exports.configValueItemColor = exports.configKeyColor = exports.configKey = exports.gormSeparators = exports.separators = exports.tagBorder = exports.itemOptionSeparator = exports.valueBorder = exports.valueItemsSeparator = exports.keyValueSeparator = exports.regexpMatchTags = void 0;
exports.regexpMatchTags = /([a-zA-Z_]+[a-zA-Z0-9_]*|})\s*[^(/\*.*\*/)|=]*\s*`.+`/;
// [TagStringSeparators]
exports.keyValueSeparator = 'key_value';
exports.valueItemsSeparator = 'value_items';
exports.valueBorder = 'value_border';
exports.itemOptionSeparator = 'item_option';
exports.tagBorder = 'tag_border';
exports.separators = {
    [exports.keyValueSeparator]: ':',
    [exports.valueItemsSeparator]: ',',
    [exports.itemOptionSeparator]: '=',
    [exports.valueBorder]: '"',
    [exports.tagBorder]: '`'
};
exports.gormSeparators = {
    [exports.valueItemsSeparator]: ';',
    [exports.itemOptionSeparator]: ':'
}; // [/]
// [ConfigurationKeys]
exports.configKey = "rainbow-struct-field-tags";
exports.configKeyColor = "key-color";
exports.configValueItemColor = "value-item-color";
exports.configValueOptionColor = "value-option-color";
exports.configValueGapColor = "value-gap-color";
exports.configBackgroundColor = 'background-color';
exports.configTextColor = 'text-color'; // [/]
// [AnnotationSigns]
exports.singleLineAnnotationSign = '//';
exports.multiLineAnnotationStart = '/*';
exports.multiLineAnnotationEnd = '*/'; // [/]
//# sourceMappingURL=common.js.map