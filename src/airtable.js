const Airtable = require('airtable');

module.exports.baseId = process.env.AIRTABLE_BASE;
module.exports.mentorsTableId = 'Mentors';
module.exports.projectsTableId = 'Projects';
module.exports.studentsTableId = 'Students';

module.exports.base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(module.exports.baseId);
module.exports.mentorsTable = module.exports.base.table(module.exports.mentorsTableId);
module.exports.projectsTable = module.exports.base.table(module.exports.projectsTableId);
module.exports.studentsTable = module.exports.base.table(module.exports.studentsTableId);


module.exports.fetchAll = async (select) => {
  let allRecords = [];

  await select.eachPage((records, fetchNextPage) => {
    allRecords = [...allRecords, ...records];
    fetchNextPage();
  });

  return allRecords;
};

module.exports.dedup = async (table, rows) => {
  const idCol = Object.keys(rows[0])[0];
  const existingRows = await exports.fetchAll(table.select({ fields: ['Cognito ID'] }));
  const ids = existingRows.map((row) => row.fields[['Cognito ID']]);
  return rows.filter((row) => !ids.includes(row[idCol]));
}
