require('dotenv').config();
const sync = require('./sync');
const notify = require('./notify');
const exportData = require('./export');


(async () => {
  //console.log('Syncing records...');
  //await sync();

  //console.log('Sending notification emails...');
  //await notify();

  console.log('Exporting data...');
  await exportData();
})();
