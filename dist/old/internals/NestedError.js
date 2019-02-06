"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedError = (prefix, source) => {
    const message = ''.concat(prefix, ' » ', source.message);
    const error = Error(message);
    if (error.stack !== undefined && source.stack !== undefined) {
        error.stack = ''.concat(error.toString(), '\n', source.stack.split('\n').slice(1, 3).join('\n'), '\n', error.stack.split('\n').slice(2, 3).join('\n'));
    }
    return error;
};
