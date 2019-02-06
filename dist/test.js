"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const db = new index_1.Database('asd', './temp');
const users = db.useTable('users');
console.log({ users });
users.insertItem('alice', {
    name: 'alice',
    age: 25
});
console.log({ users });
const results = new index_1.Query(users).results();
console.log({ results });
