const inquirer = require('inquirer');
const moment = require('moment-timezone');
const pMap = require('p-map');
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const { contentTable, notificationTable, fetchAll } = require('../airtable');

module.exports = async () => {
  const events = await fetchAll(contentTable.select({ fields: ['Title', 'Date']}));
  const notifySubscribers = await fetchAll(notificationTable.select({ fields: ['Phone', 'Event'] }));

  const currentEvents = events.filter((e) => {
    const date = moment.utc(e.fields.Date);
    const now = moment.utc();

    return e.fields.Title
      && date.clone().add(1, 'hour').isAfter(now)
      && date.clone().subtract(12, 'hour').isBefore(now);
  });

  if (currentEvents.length === 0) {
    console.error('No upcoming events. Have a nice day!');
    return;
  }

  const { eventId } = await inquirer.prompt([
    {
      name: 'eventId',
      type: 'list',
      choices: currentEvents.map((e) => ({ name: e.fields.Title, value: e.id })),
      default: currentEvents[0].id,
      message: 'Which event is starting?',
    },
  ]);
  const selectedEvent = currentEvents.filter((e) => e.id === eventId)[0];
  const message = `"${selectedEvent.fields.Title}" from CodeLabs is starting.\n\n`
                  +`Join on your computer @ labs.codeday.org/schedule`;

  const eventNotifySubscribers = notifySubscribers
    .filter((e) => e.fields.Event.includes(eventId))
    .map((e) => e.fields.Phone);

  await pMap(eventNotifySubscribers, async (phone) => {
    console.log(`|- ${phone}`);
    try {
      await twilio.messages.create({
        from: process.env.TWILIO_FROM,
        to: phone,
        body: message,
      });
    } catch (err) {
      console.error(err);
    }
  }, { concurrency: 2});
}
