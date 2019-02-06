/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { Database, Query, Transaction }  from './index';

interface User {
  name: string;
  age: number;
}
interface Documents {
  name: string;
  timestamp: number;
}

const db = new Database('mydatabase', './temp');
const users = db.useTable <User> ('users');
users.clearTable();
users.insertItem('alice', {
  name: 'alice',
  age: 25
});

// const results = new Query (users).results();
// console.log({ results });

const t = new Transaction (db);
const alice = t.fetchItem(users, 'alice');
// console.log({ db, users,  alice });
alice.age = 26;
t.commit();