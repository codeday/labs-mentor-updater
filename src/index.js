require('dotenv').config();
const sync = require('./sync');
const notify = require('./notify');


(async () => {
  console.log('Syncing records...');
  await sync();

  console.log('Sending notification emails...');
  await notify();
})();
