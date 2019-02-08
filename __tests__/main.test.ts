
import { Database, Table, Transaction } from '../src/main';

let db = new Database('test', './temp');

interface User {
  name?: string;
  age?: number;
  address?: string;
}

beforeAll(async () => {
  await db.initialize();
});

test('t1: table label', async () => {
  const t1 = new Table('t1', db);
  await t1.clearTable();
  expect(t1.label).toBe('t1');
});

test('t2: insertItem, randomItemId', async () => {
  const t2 = new Table <User> ('t2', db);
  await t2.clearTable();
  const aliceId = t2.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t2.insertItem (aliceId, aliceData);
  expect(t2.ids.length).toBe(1);
  expect(t2.index.has(aliceId)).toBe(true);
  expect(t2.insertItem(aliceId, aliceData)).rejects.toThrow();
});

test('t3: updateItem', async () => {
  const t3 = new Table <User> ('t3', db);
  await t3.clearTable();
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
  await t4.clearTable();
  const aliceId = t4.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  let alice = await t4.insertItem (aliceId, aliceData);
  expect(alice.name).toBe('alice');
  expect(alice.age).toBe(25);
  aliceData.age = 27;
  alice = await t4.updateItemById(aliceId, aliceData);
  expect(alice.age).toBe(27);
});

test('t5: mergeItemById', async () => {
  const t5 = new Table <User> ('t5', db);
  await t5.clearTable();
  const aliceId = t5.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  let alice = await t5.insertItem (aliceId, aliceData);
  alice = await t5.mergeItemById(aliceId, { address: 'yeah' });
  expect(alice.address).toBe('yeah');
});

test('t6: removeItem ', async () => {
  const t6 = new Table <User> ('t6', db);
  await t6.clearTable();
  const aliceId = t6.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t6.insertItem (aliceId, aliceData);
  await t6.removeItem(alice);
  expect(t6.ids.length).toBe(0);
  expect(t6.items.length).toBe(0);
  expect(t6.index.size).toBe(0);
});

test('t7: removeItemById ', async () => {
  const t7 = new Table <User> ('t7', db);
  await t7.clearTable();
  const aliceId = t7.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t7.insertItem (aliceId, aliceData);
  await t7.removeItemById(aliceId);
  expect(t7.ids.length).toBe(0);
  expect(t7.items.length).toBe(0);
  expect(t7.index.size).toBe(0);
});

test('t8: getItemId ', async () => {
  const t8 = new Table <User> ('t8', db);
  await t8.clearTable();
  const aliceId = t8.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t8.insertItem (aliceId, aliceData);
  const id = t8.getItemId(alice);
  expect(aliceId).toBe(id);
});

test('t9: getItemById ', async () => {
  const t9 = new Table <User> ('t9', db);
  await t9.clearTable();
  const aliceId = t9.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t9.insertItem (aliceId, aliceData);
  const item = t9.getItemById(aliceId);
  expect(alice).toStrictEqual(item);
});

test('t10: removeTable ', async () => {
  const t10 = new Table <User> ('t10', db);
  await t10.clearTable();
  t10.removeTable();
  expect(db.index.has('t10')).toStrictEqual(false);
});

test('t11: Transaction ', async () => {
  const t11 = new Table <User> ('t11', db);
  await t11.clearTable();
  const aliceId = t11.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t11.insertItem (aliceId, aliceData);
  await t11.insertItem ('cathy-id', { name: 'cath' });
  const t = new Transaction(db);
  const alice = t.fetchItem(t11, aliceId);
  expect(alice.name).toBe('alice');
  expect(alice.age).toBe(25);
  const bob = t.createItem(t11, 'bob-id', { name: 'bob' });
  t.removeItemById(t11, 'cathy-id');
  t.removeItem(bob);
  await t.commit();
  expect(t11.ids.length).toBe(1);
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