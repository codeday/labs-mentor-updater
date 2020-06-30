require('dotenv').config();
const yargs = require('yargs');
const sync = require('./sync');
const notify = require('./notify');
const exportData = require('./export');
const checkin = require('./checkin');
const alert = require('./alert');

const argv = yargs
  .command('sync', 'syncs cognito to airtable', () => {}, async () => {
    console.log('Syncing records...');
    await sync();
  })
  .command('export', 'exports airtable for matching app', () => {}, async () => {
    console.log('Exporting data...');
    await exportData();
  })
  .command('notify', 'sends notification emails', () => {}, async () => {
    console.log('Sending notification emails...');
    await notify();
  })
  .command('checkin', 'sends weekly check-in emails', () => {}, async () => {
    console.log('Sending check-in emails...');
    await checkin();
  })
  .command('alert', 'sends text message alerts for starting events', () => {}, async () => {
    await alert();
  })
  .help()
  .argv;
