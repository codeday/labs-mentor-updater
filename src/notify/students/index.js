const htmlToText = require('html-to-text');
const { sendEmail } = require('../../postmark');
const { studentsTable, studentsTableId, fetchAll } = require('../../airtable');
const { nl2br } = require('../../utils');
const { makeConfirmLink } = require('../../utils');

const messages = (student) => ({
  'Admission - Early':
    `<p><strong>We are pleased to offer you early admission to CodeLabs in the ${student.Track} track.</strong></p>`
    + `<p>(If your track doesn't match what you applied with, it's because we think this is the best track after reading`
    + ` your application. Sometimes this can be wrong, especially if you didn't provide much detail. If you have`
    + ` any concerns, please reply to this email.)</p>`
    + `<p>Remember, CodeLabs is NOT a paid internship, and you won't be working on a commercial product, but you will`
    + ` have the help of a mentor and up to two other students as you build a product using technology similar to that`
    + ` used in the real world.</p>`
    + `<p>Before you choose one of the options below, we encourage you to read more about the program on`
    + ` <a href="https://labs.codeday.org">the CodeLabs website,</a> and reply to this email with any questions you`
    + ` might have. Make sure this is the right fit for you!</p>`
    + `<p><strong>Please choose one of these options within the next 3 days.</strong></p>`
    + `<p><strong><a href="${makeConfirmLink(studentsTableId, student.id, "Confirm you WILL be participating in CodeLabs", "Confirmed")}">Yes, I will be participating in CodeLabs.</a></strong></p>`
    + `<p><strong><a href="${makeConfirmLink(studentsTableId, student.id, "Confirm you will NOT be participating in CodeLabs", "Student Rejected")}">No, I will NOT be participating in CodeLabs. Please give my spot to someone else.</a></strong></p>`,
  'Admission - Normal':
    `<p><strong>We are pleased to offer you admission to CodeLabs in the ${student.Track} track.</strong></p>`
    + `<p>(If your track doesn't match what you applied with, it's because we think this is the best track after reading`
    + ` your application. Sometimes this can be wrong, especially if you didn't provide much detail. If you have`
    + ` any concerns, please reply to this email.)</p>`
    + `<p>Remember, CodeLabs is NOT a paid internship, and you won't be working on a commercial product, but you will`
    + ` have the help of a mentor and up to two other students as you build a product using technology similar to that`
    + ` used in the real world.</p>`
    + `<p>Before you choose one of the options below, we encourage you to read more about the program on`
    + ` <a href="https://labs.codeday.org">the CodeLabs website,</a> and reply to this email with any questions you`
    + ` might have. Make sure this is the right fit for you!</p>`
    + `<p><strong>Please choose one of these options within the next 3 days.</strong></p>`
    + `<p><strong><a href="${makeConfirmLink(studentsTableId, student.id, "Confirm you WILL be participating in CodeLabs", "Confirmed")}">Yes, I will be participating in CodeLabs.</a></strong></p>`
    + `<p><strong><a href="${makeConfirmLink(studentsTableId, student.id, "Confirm you will NOT be participating in CodeLabs", "Student Rejected")}">No, I will NOT be participating in CodeLabs. Please give my spot to someone else.</a></strong></p>`,
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
    `<p>Unfortunately we weren't able to make a decision either way on your CodeLabs application. If you'd like to`
    + ` be considered for regular decisions, please re-apply with additional detail in your application.</p>`,
  'Rejected':
    `<p>Unfortunately, we don't think you're the right fit for the CodeLabs program at this time.</p>`
    + `<p>Due to cuts from COVID-19, we have experienced an unprecedented number of applicants. We've chosen to`
    + ` prioritize those for whom the particular type of real-world programming experience we can offer would make the`
    + ` biggest difference.</p>`,
  'Confirmed':
    `<p>Thank you for confirming your admission to CodeLabs! We'll be in touch shortly with the next steps!</p>`,
  'Defer':
    `<p>Good news, bad news time.</p>`
    + `<p>The bad news is, we weren't able to offer you early admission to CodeLabs.</p>`
    + `<p>The good news is, you're not out of the running. We still think you'd be a great fit for the program, and`
    + ` we're working to find more mentors. We'll get back to you in a few weeks, once we know our final mentor count`
    + ` and can make a decision on your application.</p>`
    + `<p>We're sure this isn't the news you were hoping to hear, but we're still hopeful we can find a place for you.</p>`,
  'Special Defer':
    `<p>Good news, bad news time.</p>`
    + `<p>The bad news is, we weren't able to offer you early admission to CodeLabs.</p>`
    + `<p>The good news is, we're feeling confident we'll be able to find you a mentor. You're at the very top of our`
    + `list right now. You will be one of the first to gain admission as we find more mentors.</p>`,
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
