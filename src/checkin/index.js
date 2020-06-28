const { mentorsTable, projectsTable, studentsTable, fetchAll } = require('../airtable');
const btoa = require('btoa');
const htmlToText = require('html-to-text');
const moment = require('moment');
const { sendEmail } = require('../postmark');

module.exports = async () => {
  const mentors = await Promise.all(
    (await fetchAll(mentorsTable.select({ filterByFormula: `{Status} = "Introduced"` })))
      .map(async ({ id, fields: { Projects, ...fields } }) => ({
        ...fields,
        id,
        Projects: Projects && await Promise.all(
          (await Promise.all(Projects.map(async (id) => (await projectsTable.find(id)) )))
          .map(async ({ id: projectId, fields }) => ({
            ...fields,
            id: projectId,
            Team: fields.Team && (await Promise.all(fields.Team.map(async (studentId) => (await studentsTable.find(studentId)))))
              .map(({ id: studentId, fields}) => ({ id: studentId, ...fields })),
          }))
        ),
      }))
  );

  const managers = {
    'Alexander Parra': 'alexparra',
    'Mingjie Jiang': 'mingjie',
    'Tyler Menezes': 'tylermenezes',
  };

  const startOfWeek = moment().day() < 2 ? moment().subtract(1, 'week').startOf('week') : moment().startOf('week');
  const endOfWeek = startOfWeek.clone().endOf('week');

  for (let mentor of mentors) {
    const checkinToken = btoa(JSON.stringify({
      id: mentor.id,
      firstName: mentor['First Name'],
      lastName: mentor['Last Name'],
      cc: managers[mentor.Assignee.name] || 'labs',
      students: mentor.Projects.reduce((accum, project) => [...accum, ...project.Team.map((student) => ({
        name: student.Name,
        id: student.id,
        project_id: project.id,
      }))], []),
    }));

    const body =
      `<p>${mentor['First Name']}, it's time to complete the weekly CodeLabs student evaluation check-in for the period`
      + ` from ${startOfWeek.format('dddd, MMMM D')} to ${endOfWeek.format('dddd, MMMM D')}.</p>`
      + `<p><a href="https://labs.codeday.org/mentor/checkin?token=${checkinToken}">Complete your check-in.</a></p>`
      + `<p>Taking ~5min to fill this out helps us spot students having trouble, so our team can follow up with them.`
      + ` For students receiving school credit for CodeLabs, we'll also transmit your responses to their school.</p>`
      + `<p>Thanks so much for your help, ${mentor['First Name']}!<br />-${mentor.Assignee.name}, and the CodeLabs team</p>`;

    const bodyText = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });

    console.log(`|- ${mentor.Name}`);
    try {
      await sendEmail({
        From: 'labs@codeday.org',
        To: `"${mentor.Name}" <${mentor.Email}>`,
        Subject: `[Action Required] CodeLabs Checkin, ${startOfWeek.format('MMM D')}-${endOfWeek.format('MMM D')}`,
        HtmlBody: body,
        TextBody: bodyText,
      });
    } catch (err) {
      console.error(err);
    }

  }


}
