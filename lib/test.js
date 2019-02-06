"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
const db = new main_1.Database('mydatabase', './temp', '5s');
const users = db.useTable('users');
users.clearTable();
users.insertItem('alice', {
    name: 'alice',
    age: 25
});
users.insertItem('cathy', {
    name: 'cathy',
    age: 27
});
users.insertItem('donna', {
    name: 'donna',
    age: 30
});
const t = new main_1.Transaction(db);
const alice = t.fetchItem(users, 'alice');
alice.age = 26;
const bob = t.createItem(users, 'bob', {
    name: 'bob',
    age: 23
});
bob.age = 24;
t.removeItemById(users, 'cathy');
const donna = t.fetchItem(users, 'donna');
t.removeItem(donna);
t.commit();
