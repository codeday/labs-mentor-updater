const htmlToText = require('html-to-text');
const { sendEmail } = require('../../postmark');
const { studentsTable, studentsTableId, projectsTable, projectsTableId, fetchAll } = require('../../airtable');
const { nl2br } = require('../../utils');
const { makeConfirmLink } = require('../../utils');

const messages = (student) => ({
  'Admission - Normal':
    `<p><strong>We are pleased to offer you early admission to CodeLabs in the ${student.Track} track.</strong></p>`
    + `<p>If your track doesn't match what you applied with, it's because we think this is the best track after reading`
    + ` your application. Sometimes this can be wrong, especially if you didn't provide much detail. If you have`
    + ` any concerns, please reply to this email.</p>`
    + `<p>(If had previously heard back that you were not accepted, this offer supersedes that. We had slightly more`
    + ` mentors than we expected.)</p>`
    + `<p>Remember, CodeLabs is NOT a paid internship, and you won't be working on a commercial product, but you will`
    + ` have the help of a mentor and up to two other students as you build a product using technology similar to that`
    + ` used in the real world.</p>`
    + `<p>Before you choose one of the options below, we encourage you to read more about the program on`
    + ` <a href="https://labs.codeday.org/info/accepted">the CodeLabs Accepted Student Info website,</a> and reply to`
    + ` this email with any questions you might have. Make sure this is the right fit for you!</p>`
    + `<p>If you confirm your application, you are committing to stay the course, to put in`
    + ` ${student['Time Commitment'] || 'the number of hours you applied with'} per week to work on your project, to`
    + ` make yourself reasonably available for team meetings during the day, and to follow through on the commitments`
    + ` you make to your group members.</p>`
    + `<p>Important: Please reject this offer if you already have another internship or full-time summer program.`
    + ` We are prioritizing admissions for students who do not have other opportunities. (It's fine if you work an`
    + ` unrelated job to support yourself, however.)</p>`
    + `<p>Within a few days of confirming, we'll send you a list of possible projects and ask for your preferences.`
    + ` You must complete this survey to finalize your spot.</p>`
    + `<p><strong>Please choose one of these options within the next 3 days.</strong></p>`
    + `<p><strong><a href="${makeConfirmLink(studentsTableId, student.id, "Confirm you WILL be participating in CodeLabs", "Confirmed")}">Yes, I will be participating in CodeLabs.</a></strong></p>`
    + `<p><strong><a href="${makeConfirmLink(studentsTableId, student.id, "Confirm you will NOT be participating in CodeLabs", "Student Rejected")}">No, I will NOT be participating in CodeLabs. Please give my spot to someone else.</a></strong></p>`,
  'Rejected - No Match':
    `<p>Unfortunately, CodeLabs won't be able to accept you at this time.</p>`
    + `<p>Your application was fantastic, and we think you would have been a great fit for our program. Unfortunately,`
    + ` we were not able to find a mentor who would be a good match for you. (We look at things like interests, time`
    + ` zones, etc.)</p>`
    + `<p>We hope to hear more great things from you in the future. Keep coding cool things.</p>`,
  'Rejected - Too Much Experience':
    `<p>Unfortunately, CodeLabs won't be able to accept you at this time. Our reviewers did think your application was`
    + ` great! In fact, your application looks so great that we don't think participating in CodeLabs will make a big`
    + ` impact on your future career prospects.</p>`
    + `<p>Due to cuts from COVID-19, we have experienced an unprecedented number of applicants. We've chosen to`
    + ` prioritize those for whom a real-world work experience would make the biggest difference this year.</p>`
    + `<p>Put another way: it's not you, it's us! We really think you're an excellent programmer and wish you luck in`
    + ` your future career!</p>`,
  'Rejected - Too Little Experience':
    `<p>Unfortunately, CodeLabs won't be able to accept you at this time. CodeLabs is a very self-driven program,`
    + ` and our reviewers were concerned that you didn't have the necessary experience to succeed in a hands-off`
    + ` environment at this point.</p>`
    + `<p>We really hope you'll reapply for a future session!</p>`,
  'Rejected - Too Little Detail':
    `<p>Unfortunately, CodeLabs won't be able to accept you this year. We didn't feel that your application provided`
    + ` enough details for us to be confident that you would be a good fit for our program.</p>`,
  'Rejected':
    `<p>Unfortunately, we don't think you're the right fit for the CodeLabs program at this time.</p>`
    + `<p>Due to cuts from COVID-19, we have experienced an unprecedented number of applicants. We've chosen to`
    + ` prioritize those for whom the particular type of real-world programming experience we can offer would make the`
    + ` biggest difference.</p>`,
  'Confirmed':
    `<p>Thank you for confirming your admission to CodeLabs! We'll be in touch shortly with the next steps!</p>`
})[student['Status']];

module.exports = async () => {
  const students = await Promise.all(
    (await fetchAll(studentsTable.select({ filterByFormula: 'NOT(OR({Status} = "Applied", {Notified}))' })))
      .map(async ({ id, fields: { Projects, ...fields } }) => ({
        ...fields,
        id,
        Projects: Projects && (await Promise.all(Projects.map(async (id) => (await projectsTable.find(id)) )))
          .map(({ id: projectId, fields }) => ({
            ...fields,
            id: projectId,
          })),
      }))
  );

  students.forEach(async (student) => {
    const actionRequired = (['Admission - Early', 'Admission - Normal'].includes(student.Status)) ? '[Action Required] ' : '';
    const message = messages(student);
    if (!message) return;

    const from = `${process.env.POSTMARK_FROM}`;
    const to = student.Email;
    const subject = `${actionRequired}Your CodeLabs Application`;
    const body = `<p>Hi ${student['First Name']}, thanks for submitting your application to CodeLabs 2020.</p>`
      + message
      + `<p>---<br />The CodeDay Team<br />(Alex, Cora, Erika, Jake, James, Lola, Mingjie, Nik, Otto, and Tyler)</p>`;
    const textBody = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });
    console.log(`  |- ${student.Name}: ${student.Status}`);

    await sendEmail({
      From: from,
      To: to,
      Subject: subject,
      HtmlBody: body,
      TextBody: textBody,
    });
    await studentsTable.update([{ id: student.id, fields: { Notified: true }}]);
  });
}
