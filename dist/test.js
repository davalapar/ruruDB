"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const db = new index_1.Database('mydatabase', './temp');
const users = db.useTable('users');
users.clearTable();
users.insertItem('alice', {
    name: 'alice',
    age: 25
});
const t = new index_1.Transaction(db);
const alice = t.fetchItem(users, 'alice');
alice.age = 26;
t.commit();
