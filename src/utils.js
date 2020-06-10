const axios = require('axios');
const { lookup } = require( 'zipcode-to-timezone' );
const csvParse = require('csv-parse/lib/sync');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone')
const { sign } = require('jsonwebtoken');
const { baseId } = require('./airtable');


module.exports.nl2br = (str) => str ? str.replace(/\n/g, "<br />") : '';

module.exports.makeLink = (tableId, recordId, titleField, fields) => process.env.EDIT_BASE + sign({
    base: baseId,
    table: tableId,
    record: recordId,
    title: titleField,
    fields,
  }, process.env.EDIT_SECRET);

module.exports.makeConfirmLink = (tableId, recordId, title, confirmState) => {
  return process.env.EDIT_BASE + sign({
    base: baseId,
    table: tableId,
    record: recordId,
    titleString: title,
    confirmField: 'Status',
    confirmState,
  }, process.env.EDIT_SECRET, { expiresIn: "3d" });
}

const urbanRural = csvParse(fs.readFileSync(path.join(path.dirname(__dirname), 'data', 'rural.csv')), { columns: true })
  .reduce((accum, {zip, status}) => { accum[zip] = status; return accum; }, {});

const isRural = (zip) => zip in urbanRural && urbanRural[zip] === 'RURAL';

module.exports.geocode = async (str) => {
  const nullResponse = {
    location: null,
    postalCode: null,
    rural: null,
    tz: null,
  };

  if (!str) return nullResponse;

  const apiKey = process.env.GEOCODE_API_KEY;
  const { data } = await axios(`https://geocode.search.hereapi.com/v1/geocode?apiKey=${apiKey}&q=${str}`);

  if (data.items.length === 0 || !data.items[0].address || !data.items[0].address.postalCode) return nullResponse;

  const postalCode = data.items[0].address.postalCode;
  const tzString = lookup(postalCode);
  const tzOffset = tzString && Math.floor(moment().tz(tzString).utcOffset()/60);

  return {
    location: data.items[0].address.label,
    postalCode,
    rural: isRural(postalCode),
    tz: tzOffset,
  };
}
