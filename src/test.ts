
import { Database, Query }  from './index';

interface User {
  name: string;
  age: number;
}

const db = new Database('mydbfile', './db');
const users = db.useTable <User> ('users');
users.insertItem('alice', {
  name: 'alice',
  age: 25
});

const results = new Query (users).results();

console.log({ results });