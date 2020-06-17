const fs = require('fs');
const path = require('path');
const { mentorsTableId, mentorsTable, projectsTable, projectsTableId, fetchAll } = require('../airtable');

module.exports = async () => {
  const mentorsWithProjects = (await Promise.all(
    (await fetchAll(mentorsTable.select({ filterByFormula: `{Status} = "Finalized"` })))
      .map(async ({ id, fields: { Projects, ...fields } }) => ({
        ...fields,
        id,
        Projects: Projects && await Promise.all(
          (await Promise.all(Projects.map(async (id) => (await projectsTable.find(id)) )))
          .map(async ({ id: projectId, fields }) => ({
            ...fields,
            id: projectId,
          }))),
      }))
  ))
  .reduce((accum, { Projects, ...mentor }) => [
    ...accum,
    ...Projects.map((proj) => ({ ...mentor, Project: proj })),
  ], []);

  const out = mentorsWithProjects.map(({ Project: project, ...mentor }) => ({
    mentor_id: mentor.id,
    name: mentor.Name,
    company: mentor.Company,
    bio: mentor.Bio,
    backgroundRural: mentor['Background Rural'] || false,
    preferStudentUnderRep: Number.parseInt(mentor['Prefer Underrepresented Students'] || '0') || 0,
    okExtended: mentor['OK Extended Internship'] || false,
    timezone: mentor['Timezone'] || -6,
    preferToolExistingKnowledge: mentor['Prefer Existing Knowledge'] || false,
    track: mentor.Track,
    proj_id: project.id,
    proj_description: project.Description,
    proj_tags: project.Tags || [],
  }));

  const filename = path.join(path.dirname(path.dirname(__dirname)), 'out', 'mentors.json');
  console.log(filename);
  fs.writeFileSync(filename, JSON.stringify(out));
}
