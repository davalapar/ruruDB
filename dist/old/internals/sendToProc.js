"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const createError = (message, stack) => {
    const error = Error(message);
    error.stack = stack;
    return error;
};
exports.queue = [];
exports.proc = child_process_1.fork(path_1.default.resolve(__dirname, './proc.js'), [], { detached: true, stdio: 'pipe' });
exports.proc.stdout.pipe(process.stdout);
exports.proc.on('message', ([result, error]) => {
    const [resolve, reject] = exports.queue.shift();
    if (error) {
        const [message, stack] = error;
        reject(createError(message, stack));
    }
    else {
        resolve(result);
    }
});
