const fs = require('fs');
const path = require('path');
const { studentsTable, studentsTableId, fetchAll } = require('../airtable');

module.exports = async () => {
  const students = await Promise.all(
    (await fetchAll(studentsTable.select({ filterByFormula: `{Status} = "Confirmed"` })))
      .map(async ({ id, fields: { Projects, ...fields } }) => ({
        ...fields,
        id,
      }))
  );

  const out = students.map((student) => ({
    id: student.id,
    name: student.Name,
    rural: student.Rural || false,
    underrepresented: student.Underrepresented || false,
    requireExtended: student['Extended Internship'],
    timezone: student.Timezone || -6,
    interestCompanies: (student['Interested Companies'] || '').split(','),
    interestTags: student.Interests || [],
    track: student.Track,
  }))


  const filename = path.join(path.dirname(path.dirname(__dirname)), 'out', 'students.json');
  console.log(filename);
  fs.writeFileSync(filename, JSON.stringify(out));
}
