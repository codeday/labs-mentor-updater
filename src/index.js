require('dotenv').config();
const { sign } = require('jsonwebtoken');
const stringify = require('csv-stringify/lib/sync');
const Airtable = require('airtable');
const { fetchAll } = require('./airbase');

const baseId = process.argv[2];
const mentorsTableId = 'Mentors';
const projectsTableId = 'Projects';

const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(baseId);
const mentorsTable = base.table(mentorsTableId);
const projectsTable = base.table(projectsTableId);

const makeLink = (tableId, recordId, titleField, fields) => {
  return process.env.EDIT_BASE + sign({
    base: baseId,
    table: tableId,
    record: recordId,
    title: titleField,
    fields,
  }, process.env.EDIT_SECRET);
}

(async () => {
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
        Projects: Projects && (await Promise.all(Projects.map(async (id) => (await projectsTable.find(id)) )))
          .map(({ id: projectId, fields }) => ({
            ...fields,
            id: projectId,
            editRecordLink: makeLink(projectsTableId, projectId, 'Project Name', [
              { name: 'Description', required: true, type: 'textarea' },
            ]),
          })),
      }))
  );

  const csvMentors = mentors
    .map((mentor) => ({
      email: mentor.Email,
      name: mentor.Name,
      mentorEdit: `Company: ${mentor.Company}\nRole: ${mentor.Role}\nBio: ${mentor.Bio}\nEdit: ${mentor.editRecordLink}`,
      projectEdit: mentor.Projects
        .map((project) => `${project.Description || '(no description)'}\nEdit: ${project.editRecordLink}`)
        .join("\n\n"),
    }));

  console.log(stringify(csvMentors, { header: true }));
})();
