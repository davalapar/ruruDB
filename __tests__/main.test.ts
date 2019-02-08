import { Database, Table } from '../src/main';

let db = new Database('test', './temp');

interface User {
  name: string;
  age: number;
}

beforeAll(async () => {
  await db.initialize();
});

test('t1: table label', () => {
  const t1 = new Table('t1', db);
  expect(t1.label).toBe('t1');
});

test('t2: insertItem, randomItemId', async () => {
  const t2 = new Table <User> ('t2', db);
  const aliceId = t2.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t2.insertItem (aliceId, aliceData);
  expect(t2.ids.length).toBe(1);
  expect(t2.index.has(aliceId)).toBe(true);
  expect(t2.insertItem(aliceId, aliceData)).rejects.toThrow();
});

test('t3: updateItem', async () => {
  const t3 = new Table <User> ('t3', db);
  const aliceId = t3.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t3.insertItem (aliceId, aliceData);
  expect(alice.name).toBe('alice');
  expect(alice.age).toBe(25);
  alice.age = 26;
  await t3.updateItem(alice);
  const fetched = t3.index.get(aliceId);
  if (fetched !== undefined) {
    expect(fetched.age).toBe(26);
  }
});

test('t4: updateItemById', async () => {
  const t4 = new Table <User> ('t4', db);
  const aliceId = t4.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  let alice = await t4.insertItem (aliceId, aliceData);
  expect(alice.name).toBe('alice');
  expect(alice.age).toBe(25);
  aliceData.age = 27;
  alice = await t4.updateItemById(aliceId, aliceData);
  expect(alice.age).toBe(27);
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