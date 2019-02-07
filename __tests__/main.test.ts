import { Database, randomItemId } from '../src/main';

const d = new Database('test', './temp');

test('basic', () => {
  expect(0).toBe(0);
});

test('basic again', () => {
  expect(3).toBe(3);
});

test('basic again sir', () => {
  expect(5).toBe(5);
});

/*

import { Database, Query, Transaction }  from './main';

interface User {
  name: string;
  age: number;
}
interface Documents {
  name: string;
  timestamp: number;
}

const db = new Database('mydatabase', './temp', '5s');
const users = db.useTable <User> ('users');
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

// const results = new Query (users).results();
// console.log({ results });

const t = new Transaction (db);
const alice = t.fetchItem <User> (users, 'alice');
// console.log({ db, users,  alice });
alice.age = 26;
const bob = t.createItem <User> (users, 'bob', {
  name: 'bob',
  age: 23
});
bob.age = 24;
t.removeItemById(users, 'cathy');
const donna = t.fetchItem <User> (users, 'donna');
t.removeItem(donna);
t.commit();
*/