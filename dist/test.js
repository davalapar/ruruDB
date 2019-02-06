"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
(() => __awaiter(this, void 0, void 0, function* () {
    index_1.useDatabase('yeah', './temp');
    const users = index_1.useTable('users');
    index_1.clearTable(users);
    let alice = index_1.insertItem(users, { name: 'alice' }, 'alice-id');
    let bob = index_1.insertItem(users, { name: 'bob' }, 'bob-id');
    alice.age = 25;
    index_1.updateItem(alice);
    bob = index_1.updateItemByID(users, 'bob-id', { name: 'bob', age: 25 });
    bob = index_1.mergeItemByID(users, 'bob-id', { role: 'moderator' });
    index_1.removeItem(bob);
    index_1.removeItemByID(users, 'alice-id');
    let cathy = index_1.insertItem(users, { name: 'cathy' }, 'cathy-id');
    console.log(index_1.getItemID(cathy));
    console.log(index_1.getItemByID(users, 'cathy-id'));
    console.log({ alice, bob });
    index_1.removeTable(users);
    console.log({ users });
}))()
    .then(console.log)
    .catch(console.error);
