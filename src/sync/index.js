const fs = require('fs');
const path = require('path');
const { read, utils: { sheet_to_json } } = require('xlsx');
const { getCsv } = require('../cognito');
const { mentorsTable, projectsTable, studentsTable, dedup } = require('../airtable');
const mapStudents = require('./map-students');
const mapMentors = require('./map-mentors');

const readExcel = async (id) => {
  const sheets = (await read(
    (await getCsv(id)).data,
    { cellHTML: false, cellText: false, cellNf: false, cellStyles: false, cellFormula: false,}
  )).Sheets;

  return Object.keys(sheets).reduce((accum, key) => {
      accum[key.replace('.', '_')] = sheet_to_json(sheets[key]);
      return accum;
    }, {});
};

const createRows = async (fn, mainTable, table, rows, createFn) => {
  const dedupMain = await dedup(table, rows[mainTable]);
  const dedupRows = { ...rows, [mainTable]: dedupMain };

  return Promise.all((await fn(dedupRows)).map(async (row) => {
    try {
      console.log(`Adding ${mainTable} #${row['Cognito ID']}`);
      await createFn(row);
    } catch (err) {
      console.log(err);
    }
  }));
}

module.exports = async () => {
  const students = await readExcel(60);
  await createRows(mapStudents, 'StudentApplication', studentsTable, students, (row) => studentsTable.create(row));

  /* Example of an update:
  const mappedStudents = await mapStudents(students);
  mappedStudents.forEach(async (student) => {
    const existingRecord = await studentsTable.select({ filterByFormula: `{Cognito ID} = "${student['Cognito ID']}"`, fields: ['Cognito ID']}).firstPage();
    if (existingRecord && existingRecord.length > 0 && existingRecord[0]);

    studentsTable.update([{ id: existingRecord[0].id, fields: {
      Resume: student.Resume,
      Pronoun: student.Pronoun,
      Ethnicity: student.Ethnicity,
    }}], {}, () => {});
  })
  */

  const mentors = await readExcel(57);
  await createRows(mapMentors, 'CodeLabsMentorApplication', mentorsTable, mentors, async (row) => {
    const projects = await Promise.all(row.Projects.map(async (prj) => projectsTable.create(prj)));
    return await mentorsTable.create({ ...row, Projects: projects.map((prj) => prj.id) });
  })
};
