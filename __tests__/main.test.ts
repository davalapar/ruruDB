
import { Item, Database, Table, Query } from '../src/main';

const db = new Database('test', './temp', false, '1s');

interface User extends Item {
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
  const t2 = new Table ('t2', db);
  await t2.clearTable();
  const aliceId = t2.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t2.insertItem (aliceId, aliceData);
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
  const t4 = new Table ('t4', db);
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
  const t5 = new Table ('t5', db);
  await t5.clearTable();
  const aliceId = t5.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  let alice = await t5.insertItem (aliceId, aliceData);
  alice = await t5.mergeItemById(aliceId, { address: 'yeah' });
  expect(alice.address).toBe('yeah');
  await t5.clearTable();
});

test('t6: removeItem ', async () => {
  const t6 = new Table ('t6', db);
  await t6.clearTable();
  const aliceId = t6.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t6.insertItem (aliceId, aliceData);
  await t6.removeItem(alice);
  expect(t6.index.size).toBe(0);
  await t6.clearTable();
});

test('t7: removeItemById ', async () => {
  const t7 = new Table ('t7', db);
  await t7.clearTable();
  const aliceId = t7.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t7.insertItem (aliceId, aliceData);
  await t7.removeItemById(aliceId);
  expect(t7.index.size).toBe(0);
  await t7.clearTable();
});

test('t8: fetchItemId ', async () => {
  const t8 = new Table ('t8', db);
  await t8.clearTable();
  const aliceId = t8.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t8.insertItem (aliceId, aliceData);
  expect(alice.id).toBe(aliceId);
  await t8.clearTable();
});

test('t9: fetchItem ', async () => {
  const t9 = new Table ('t9', db);
  await t9.clearTable();
  const aliceId = t9.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t9.insertItem (aliceId, aliceData);
  const item = t9.fetchItem(aliceId);
  expect(alice).toStrictEqual(item);
  await t9.clearTable();
});

test('t10: removeTable ', async () => {
  const t10 = new Table ('t10', db);
  await t10.clearTable();
  t10.removeTable();
  expect(db.index.has('t10')).toStrictEqual(false);
  await t10.clearTable();
});

const sleep = (timeout: number) : Promise<void> => new Promise(resolve => setTimeout(resolve, timeout));

test('t12: abuse test case # 1 ', async () => {
  const t12 = new Table ('t12', db);
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
  const t13 = new Table ('t13', db);
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
  const t14 = new Table ('t14', db);
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
  const t15 = new Table ('t15', db);
  await t15.clearTable();
  const aliceId = t15.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t15.insertItem (aliceId, aliceData);
  const bobId = t15.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  const bob = await t15.insertItem (bobId, bobData);
  const [ids, items] = new Query(t15)
    .eq('age', 23)
    .results();
  expect(ids.length).toBe(1);
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(bob);
  // console.log({ ids, items });
  await t15.clearTable();
});

test('t16: Query neq', async () => {
  const t16 = new Table ('t16', db);
  await t16.clearTable();
  const aliceId = t16.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t16.insertItem (aliceId, aliceData);
  const bobId = t16.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  const bob = await t16.insertItem (bobId, bobData);
  const [ids, items] = new Query(t16)
    .neq('age', 25)
    .results();
  expect(ids.length).toBe(1);
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(bob);
  // console.log({ ids, items });
  await t16.clearTable();
});

test('t17: Query firstId', async () => {
  const t17 = new Table ('t17', db);
  await t17.clearTable();
  const aliceId = t17.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t17.insertItem (aliceId, aliceData);
  const bobId = t17.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t17.insertItem (bobId, bobData);
  const fetchedAlice = new Query(t17)
    .eq('age', 25)
    .firstItem();
  expect(fetchedAlice).toStrictEqual(alice);
  // console.log({ ids, items });
  await t17.clearTable();
});

test('t18: Query firstId undefined', async () => {
  const t18 = new Table ('t18', db);
  await t18.clearTable();
  const aliceId = t18.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t18.insertItem (aliceId, aliceData);
  const bobId = t18.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t18.insertItem (bobId, bobData);
  const fetchedAlice = new Query(t18)
    .eq('age', 100)
    .firstItem();
  expect(fetchedAlice).toBe(undefined);
  // console.log({ ids, items });
  await t18.clearTable();
});

test('t19: Query firstId', async () => {
  const t19 = new Table ('t19', db);
  await t19.clearTable();
  const aliceId = t19.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t19.insertItem (aliceId, aliceData);
  const bobId = t19.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t19.insertItem (bobId, bobData);
  const fetchedAliceId = new Query(t19)
    .eq('age', 25)
    .firstId();
  expect(fetchedAliceId).toStrictEqual(aliceId);
  // console.log({ ids, items });
  await t19.clearTable();
});

test('t20: Query firstId undefined', async () => {
  const t20 = new Table ('t20', db);
  await t20.clearTable();
  const aliceId = t20.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t20.insertItem (aliceId, aliceData);
  const bobId = t20.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t20.insertItem (bobId, bobData);
  const fetchedAliceId = new Query(t20)
    .eq('age', 100)
    .firstItem();
  expect(fetchedAliceId).toBe(undefined);
  // console.log({ ids, items });
  await t20.clearTable();
});

test('t21: Query ascend descend', async () => {
  const t21 = new Table ('t20', db);
  await t21.clearTable();
  const alice = await t21.insertItem (t21.randomItemId(), { name: 'alice', age: 25 });
  const cathy = await t21.insertItem (t21.randomItemId(), { name: 'cathy', age: 23 });
  const bob = await t21.insertItem (t21.randomItemId(), { name: 'bob', age: 24 });
  const ascended = new Query(t21)
    .ascend('age')
    .items();
  expect(ascended[0]).toStrictEqual(cathy);
  expect(ascended[1]).toStrictEqual(bob);
  expect(ascended[2]).toStrictEqual(alice);
  const descended = new Query(t21)
    .descend('age')
    .items();
  expect(descended[0]).toStrictEqual(alice);
  expect(descended[1]).toStrictEqual(bob);
  expect(descended[2]).toStrictEqual(cathy);
  await t21.clearTable();
});

test('t22: Query hide', async () => {
  const t22 = new Table ('t20', db);
  await t22.clearTable();
  await t22.insertItem (t22.randomItemId(), { name: 'alice', age: 25 });
  const fetchedAlice = new Query(t22)
    .hide('age')
    .firstItem();
  if (fetchedAlice === undefined) throw Error('fetchedAlice must not be undefined');
  expect(fetchedAlice.age).toBe(undefined);
  await t22.clearTable();
});

test('t23: Query select', async () => {
  const t23 = new Table ('t20', db);
  await t23.clearTable();
  await t23.insertItem (t23.randomItemId(), { name: 'alice', age: 25 });
  const fetchedAlice = new Query(t23)
    .select('name')
    .firstItem();
  if (fetchedAlice === undefined) throw Error('fetchedAlice must not be undefined');
  expect(fetchedAlice.age).toBe(undefined);
  await t23.clearTable();
});