
import {
  useDatabase,
  useTable,
  clearTable,
  insertItem,
  updateItem,
  updateItemByID,
  mergeItemByID,
  removeItem,
  removeItemByID,
  getItemID,
  getItemByID,
  removeTable,
  Item,
}  from './index';

(async () => {
  useDatabase('yeah', './temp');
  const users = useTable('users');
  clearTable(users);
  interface User {
    name: string;
    age?: number;
  }
  let alice = insertItem(users, { name: 'alice' }, 'alice-id');
  let bob = insertItem(users, { name: 'bob' }, 'bob-id');
  alice['asd'] = 25;
  updateItem(alice);
  bob = updateItemByID(users, 'bob-id', { name: 'bob', age: 25 });
  bob = mergeItemByID(users, 'bob-id', { role: 'moderator' });
  removeItem(bob);
  removeItemByID(users, 'alice-id');
  let cathy = insertItem(users, { name: 'cathy' }, 'cathy-id');
  console.log(getItemID(cathy));
  console.log(getItemByID(users, 'cathy-id'));
  console.log({ alice, bob });
  removeTable(users);
  console.log({ users });
})()
  .then(console.log)
  .catch(console.error);