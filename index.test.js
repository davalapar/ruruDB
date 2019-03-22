/* eslint-disable no-console, strict */

'use strict';

const { Database, Query } = require('./index');

const db = new Database({
  filename: 'test',
  directory: './temp',
  saveFormat: 'readable_json',
  logFunction: console.log,
  snapshotInterval: '1m',
});

beforeAll(async () => {
  await db.loadDatabaseFile();
  db.initTable(
    'Members',
    {
      name: { type: 'string', default: '' },
      age: { type: 'number', default: 0 },
      onboarded: { type: 'boolean', default: false },
      roles: { type: 'array', accept: 'string' },
    },
    () => {},
  );
  await db.serve();
});

const aliceData = {
  name: 'alice',
  age: 23,
  onboarded: true,
  roles: ['user', 'admin'],
};

test('Throw on string schema mismatch', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.name = false;
    await Members.updateItem(alice);
  })()).rejects.toThrow();
});

test('Throw on number schema mismatch', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.age = false;
    await Members.updateItem(alice);
  })()).rejects.toThrow();
});

test('Throw on boolean schema mismatch', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.onboarded = 'true';
    await Members.updateItem(alice);
  })()).rejects.toThrow();
});

test('Throw on array schema mismatch, outer', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.roles = true;
    await Members.updateItem(alice);
  })()).rejects.toThrow();
});

test('Throw on array schema mismatch, inner', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.roles = [true];
    await Members.updateItem(alice);
  })()).rejects.toThrow();
});

test('Does not throw on string schema match', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.name = 'alice alicey';
    await Members.updateItem(alice);
  })()).resolves.toBeUndefined();
});

test('Does not throw on number schema match', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.age = 24;
    await Members.updateItem(alice);
  })()).resolves.toBeUndefined();
});

test('Does not throw on boolean schema match', async () => {
  expect((async () => {
    const Members = db.getTable('Members');
    const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
    alice.onboarded = true;
    await Members.updateItem(alice);
  })()).resolves.toBeUndefined();
});

test('Throw on non-existent table', async () => {
  expect(() => {
    db.getTable('Non-existent-table');
  }).toThrow();
});

test('Throw on frozen item modification', async () => {
  const Members = db.getTable('Members');
  const alice = await Members.insertItem(Members.randomItemId(), aliceData);
  expect(() => {
    alice.name = 'this should throw error';
  }).toThrow();
});

// TABLES

test('Table insertItem', async () => {
  const Members = db.getTable('Members');
  await Members.insertItem(Members.randomItemId(), aliceData);
});

test('Table updateItem', async () => {
  const Members = db.getTable('Members');
  const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
  alice.age = 24;
  const updated = await Members.updateItem(alice);
  expect(updated.age).toBe(24);
});

test('Table updateItemById', async () => {
  const Members = db.getTable('Members');
  const alice = await Members.insertItem(Members.randomItemId(), aliceData, true);
  const updated = await Members.updateItemById(alice.id, aliceData);
  expect(updated.age).toBe(23);
});

test('Table mergeItemById', async () => {
  const Members = db.getTable('Members');
  const initial = await Members.insertItem(Members.randomItemId(), aliceData, true);
  const updated = await Members.mergeItemById(initial.id, { age: 25 });
  expect(updated).toStrictEqual({ ...initial, age: 25 });
});

test('Table hasId', async () => {
  const Members = db.getTable('Members');
  const initial = await Members.insertItem(Members.randomItemId(), aliceData, true);
  expect(Members.hasId(initial.id)).toBe(true);
});

test('Table fetchItem', async () => {
  const Members = db.getTable('Members');
  const initial = await Members.insertItem(Members.randomItemId(), aliceData, true);
  expect(Members.fetchItem(initial.id)).toStrictEqual(initial);
});

test('Table removeItem', async () => {
  const Members = db.getTable('Members');
  const initial = await Members.insertItem(Members.randomItemId(), aliceData, true);
  await Members.removeItem(initial);
  expect(Members.hasId(initial.id)).toBe(false);
});

test('Table removeItem', async () => {
  const Members = db.getTable('Members');
  const initial = await Members.insertItem(Members.randomItemId(), aliceData, true);
  await Members.removeItemById(initial.id);
  expect(Members.hasId(initial.id)).toBe(false);
});

test('Query basic', async () => {
  const Members = db.getTable('Members');
  const results = Members.query().results();
  expect(Array.isArray(results)).toBe(true);
});

test('Query results are frozen by default', async () => {
  const Members = db.getTable('Members');
  const results = Members.query().results();
  expect(Array.isArray(results)).toBe(true);
  expect(() => {
    results[0].age = 25;
  }).toThrow();
});

test('Query results are cloned properly', async () => {
  const Members = db.getTable('Members');
  const results = Members.query().results(true);
  expect(Array.isArray(results)).toBe(true);
  results[0].age = 25;
  expect(results[0].age).toBe(25);
});

test('Query firstResult', async () => {
  const Members = db.getTable('Members');
  const result = new Query(Members).firstResult();
  expect(typeof result).toBe('object');
});

test('Query hasResults', async () => {
  const Members = db.getTable('Members');
  const result = new Query(Members).hasResults();
  expect(typeof result).toBe('boolean');
});

test('Query countResults', async () => {
  const Members = db.getTable('Members');
  const result = new Query(Members).countResults();
  expect(typeof result).toBe('number');
});

/*

test('t14: basic Query', async () => {
  const t14 = db.table('t14');
  await t14.clear();
  const aliceId = t14.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t14.insertItem(aliceId, aliceData);
  const items = new Query(t14).results();
  expect(items[0]).toStrictEqual(alice);
  await t14.clear();
});

test('t15: Query eq', async () => {
  const t15 = db.table('t15');
  await t15.clear();
  const aliceId = t15.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t15.insertItem(aliceId, aliceData);
  const bobId = t15.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  const bob = await t15.insertItem(bobId, bobData);
  const items = new Query(t15)
    .eq('age', 23)
    .results();
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(bob);
  await t15.clear();
});

test('t16: Query neq', async () => {
  const t16 = db.table('t16');
  await t16.clear();
  const aliceId = t16.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t16.insertItem(aliceId, aliceData);
  const bobId = t16.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  const bob = await t16.insertItem(bobId, bobData);
  const items = new Query(t16)
    .neq('age', 25)
    .results();
  expect(items.length).toBe(1);
  expect(items[0]).toStrictEqual(bob);
  await t16.clear();
});

test('t17: Query firstId', async () => {
  const t17 = db.table('t17');
  await t17.clear();
  const aliceId = t17.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  const alice = await t17.insertItem(aliceId, aliceData);
  const bobId = t17.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t17.insertItem(bobId, bobData);
  const fetchedAlice = new Query(t17)
    .eq('age', 25)
    .firstResult();
  expect(fetchedAlice).toStrictEqual(alice);
  // console.log({ ids, items });
  await t17.clear();
});

test('t18: Query firstId undefined', async () => {
  const t18 = db.table('t18');
  await t18.clear();
  const aliceId = t18.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t18.insertItem(aliceId, aliceData);
  const bobId = t18.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t18.insertItem(bobId, bobData);
  const fetchedAlice = new Query(t18)
    .eq('age', 100)
    .firstResult();
  expect(fetchedAlice).toBe(undefined);
  // console.log({ ids, items });
  await t18.clear();
});

test('t20: Query firstId undefined', async () => {
  const t20 = db.table('t20');
  await t20.clear();
  const aliceId = t20.randomItemId();
  const aliceData = { name: 'alice', age: 25 };
  await t20.insertItem(aliceId, aliceData);
  const bobId = t20.randomItemId();
  const bobData = { name: 'bob', age: 23 };
  await t20.insertItem(bobId, bobData);
  const fetchedAliceId = new Query(t20)
    .eq('age', 100)
    .firstResult();
  expect(fetchedAliceId).toBe(undefined);
  // console.log({ ids, items });
  await t20.clear();
});

test('t21: Query ascend descend', async () => {
  const t21 = db.table('t20');
  await t21.clear();
  const alice = await t21.insertItem(t21.randomItemId(), { name: 'alice', age: 25 });
  const cathy = await t21.insertItem(t21.randomItemId(), { name: 'cathy', age: 23 });
  const bob = await t21.insertItem(t21.randomItemId(), { name: 'bob', age: 24 });
  const ascended = new Query(t21)
    .ascend('age')
    .results();
  expect(ascended[0]).toStrictEqual(cathy);
  expect(ascended[1]).toStrictEqual(bob);
  expect(ascended[2]).toStrictEqual(alice);
  const descended = new Query(t21)
    .descend('age')
    .results();
  expect(descended[0]).toStrictEqual(alice);
  expect(descended[1]).toStrictEqual(bob);
  expect(descended[2]).toStrictEqual(cathy);
  await t21.clear();
});

test('t22: Query hide', async () => {
  const t22 = db.table('t20');
  await t22.clear();
  await t22.insertItem(t22.randomItemId(), { name: 'alice', age: 25 });
  const fetchedAlice = new Query(t22)
    .hide('age')
    .firstResult(true);
  if (fetchedAlice === undefined) throw Error('fetchedAlice must not be undefined');
  expect(fetchedAlice.age).toBe(undefined);
  await t22.clear();
});

test('t23: Query select', async () => {
  const t23 = db.table('t20');
  await t23.clear();
  await t23.insertItem(t23.randomItemId(), { name: 'alice', age: 25 });
  const fetchedAlice = new Query(t23)
    .select('name')
    .firstResult(true);
  if (fetchedAlice === undefined) throw Error('fetchedAlice must not be undefined');
  expect(fetchedAlice.age).toBe(undefined);
  await t23.clear();
});

test('t24: KVTable 1', async () => {
  const t24 = db.kvtable('t24');
  await t24.set('x', 1);
  const x = t24.get('x');
  expect(x).toBe(1);
  await t24.clear();
});

*/

// ABUSE TEST CASES:
/*

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

test('t12: abuse test case # 1 ', async () => {
  const t12 = db.table('t12');
  const i = setInterval(() => t12.insertItem(t12.randomItemId(), { name: 'cath' }), 0);
  await sleep(250);
  clearInterval(i);
  await t12.clear();
  expect(true).toBe(true);
});

test('t13: abuse test case # 2 ', async () => {
  const t13 = db.table('t13');
  const i = setInterval(() => t13.insertItem(t13.randomItemId(), {
    str: 'something',
    number: 123,
    bool: true,
    null: null,
    undefined,
    roles: ['admin', 'user'],
    numbers: [1, 2, 3, 4],
  }), 0);
  await sleep(4000);
  clearInterval(i);
  await t13.clear();
  expect(true).toBe(true);
});

*/
