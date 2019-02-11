
import { Database, Table, Query, Transaction } from '../src/main';

let db = new Database('test', './temp', false, '1s');

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
  await t2.clearTable();
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
  await t3.clearTable();
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
  await t4.clearTable();
});

test('t5: mergeItemById', async () => {
  const t5 = new Table <User> ('t5', db);
  await t5.clearTable();
  const aliceId = t5.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  let alice = await t5.insertItem (aliceId, aliceData);
  alice = await t5.mergeItemById(aliceId, { address: 'yeah' });
  expect(alice.address).toBe('yeah');
  await t5.clearTable();
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
  await t6.clearTable();
});

test('t7: removeItemById ', async () => {
  const t7 = new Table <User> ('t7', db);
  await t7.clearTable();
  const aliceId = t7.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t7.insertItem (aliceId, aliceData);
  await t7.removeItemById(aliceId);
  expect(t7.ids.length).toBe(0);
  expect(t7.items.length).toBe(0);
  expect(t7.index.size).toBe(0);
  await t7.clearTable();
});

test('t8: getItemId ', async () => {
  const t8 = new Table <User> ('t8', db);
  await t8.clearTable();
  const aliceId = t8.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t8.insertItem (aliceId, aliceData);
  const id = t8.getItemId(alice);
  expect(aliceId).toBe(id);
  await t8.clearTable();
});

test('t9: getItemById ', async () => {
  const t9 = new Table <User> ('t9', db);
  await t9.clearTable();
  const aliceId = t9.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t9.insertItem (aliceId, aliceData);
  const item = t9.getItemById(aliceId);
  expect(alice).toStrictEqual(item);
  await t9.clearTable();
});

test('t10: removeTable ', async () => {
  const t10 = new Table <User> ('t10', db);
  await t10.clearTable();
  t10.removeTable();
  expect(db.index.has('t10')).toStrictEqual(false);
  await t10.clearTable();
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
  await t11.clearTable();
});

const sleep = (timeout: number) : Promise<void> => new Promise(resolve => setTimeout(resolve, timeout));

test('t12: abuse test case # 1 ', async () => {
  const t12 = new Table <User> ('t12', db);
  const i = setInterval(() => t12.insertItem (t12.randomItemId(), { name: 'cath' }), 0);
  await sleep(250);
  clearInterval(i);
  await t12.clearTable();
  expect(true).toBe(true);
});

test('t13: abuse test case # 2 ', async () => {
  interface CustomItem {
    str: string;
    number: number;
    bool: boolean;
    null: null;
    undefined: undefined;
    roles: string[];
    numbers: number[];
  }
  const t13 = new Table <CustomItem> ('t13', db);
  const i = setInterval(() => t13.insertItem (t13.randomItemId(), {
    str: 'something',
    number: 123,
    bool: true,
    null: null,
    undefined: undefined,
    roles: ['admin', 'user'],
    numbers: [1,2,3,4],
  }), 0);
  await sleep(250);
  clearInterval(i);
  await t13.clearTable();
  expect(true).toBe(true);
});


test('t14: basic Query', async () => {
  const t14 = new Table <User> ('t14', db);
  await t14.clearTable();
  const aliceId = t14.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t14.insertItem (aliceId, aliceData);
  const [ids, items] = new Query(t14).results();
  expect(ids.length).toBe(1);
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(alice);
  await t14.clearTable();
});

test('t15: Query eq', async () => {
  const t15 = new Table <User> ('t15', db);
  await t15.clearTable();
  const aliceId = t15.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t15.insertItem (aliceId, aliceData);
  const bobId = t15.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  const bob = await t15.insertItem (bobId, bobData);
  const [ids, items] = new Query(t15)
    .eq('age', 23)
    .results();
  expect(ids.length).toBe(1);
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(bob);
  console.log({ ids, items });
  await t15.clearTable();
});

test('t16: Query eq', async () => {
  const t16 = new Table <User> ('t16', db);
  await t16.clearTable();
  const aliceId = t16.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t16.insertItem (aliceId, aliceData);
  const bobId = t16.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  const bob = await t16.insertItem (bobId, bobData);
  const [ids, items] = new Query(t16)
    .neq('age', 25)
    .results();
  expect(ids.length).toBe(1);
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(bob);
  console.log({ ids, items });
  await t16.clearTable();
});