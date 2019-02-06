"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const sendToProc_1 = require("./sendToProc");
exports.useDatabase = (...parameters) => new Promise((resolve, reject) => {
    sendToProc_1.queue.push([resolve, reject]);
    sendToProc_1.proc.send([types_1.Actions.useDatabase, parameters]);
});
exports.useTable = (...parameters) => new Promise((resolve, reject) => {
    sendToProc_1.queue.push([resolve, reject]);
    sendToProc_1.proc.send([types_1.Actions.useTable, parameters]);
});
