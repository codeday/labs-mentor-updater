const { mentorsTableId, mentorsTable, projectsTable, projectsTableId, studentsTable, fetchAll } = require('../../airtable');
const { makeLink } = require('../../utils');

module.exports = async () => {
  const mentors = await Promise.all(
    (await fetchAll(mentorsTable.select()))
      .map(async ({ id, fields: { Projects, ...fields } }) => ({
        ...fields,
        id,
        editRecordLink: makeLink(mentorsTableId, id, 'Name', [
          { name: 'Company', required: true, type: 'text' },
          { name: 'Role', required: true, type: 'text' },
          { name: 'Bio', required: true, type: 'textarea' },
        ]),
        Projects: Projects && await Promise.all(
          (await Promise.all(Projects.map(async (id) => (await projectsTable.find(id)) )))
          .map(async ({ id: projectId, fields }) => ({
            ...fields,
            id: projectId,
            editRecordLink: makeLink(projectsTableId, projectId, 'Project Name', [
              { name: 'Description', required: true, type: 'textarea' },
            ]),
            Team: fields.Team && (await Promise.all(fields.Team.map(async (studentId) => (await studentsTable.find(studentId)))))
              .map(({ id: studentId, fields}) => ({ id: studentId, ...fields })),
          }))
        ),
      }))
  );

  await Promise.all(
    ['1-review-contact', '2-interview-finalize', '3-match-intro']
      .map((filename) => { console.log(`  |- ${filename}`); require(`./${filename}`)(mentors) })
  );
}
