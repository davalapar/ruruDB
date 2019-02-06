
import {
  Database,
  Query,
}  from './index';

// Test
interface User {
  name: string;
  age: number;
}
const db = new Database('asd', './temp');

const users = db.useTable <User> ('users');

console.log({ users });

users.insertItem('alice', {
  name: 'alice',
  age: 25
});

console.log({ users });

const results = new Query(users).results();

console.log({ results });