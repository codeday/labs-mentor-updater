const htmlToText = require('html-to-text');
const { sendEmail } = require('../../postmark');
const { mentorsTable } = require('../../airtable');
const { nl2br } = require('../../utils');

module.exports = (mentors) => mentors.filter((m) => m.Status === 'Interviewed').forEach(async (mentor) => {
    if (!mentor.Projects || mentor.Projects.length === 0) {
      console.error(`${mentor.Name} doesn't have a project!`);
      return;
    }

    const from = `"Robo-${mentor.Assignee.name}" <${process.env.POSTMARK_FROM}>`;
    const replyTo = mentor.Assignee.email;
    const to = mentor.Email;
    const projectPlural = mentor.Projects && mentor.Projects.length > 1 ? 's' : '';
    const subject = `[Action Required] Finalizing CodeLabs Project${projectPlural}`;
    const body = `<p>Hi ${mentor['First Name']},</p>`
               + `<p>This is an automated follow-up to confirm some final details about your CodeLabs`
               + ` project${projectPlural}.</p>`
               + `<p>You are a mentor for the <strong>${mentor.Track} Track</strong>. Our mentor training is available`
               + ` here: <a href="https://codeday.to/codelabs-training">https://codeday.to/codelabs-training</a></p>`
               + `<p><strong>Please read through both sections below, and click "edit" if`
               + ` you would like to change anything. The final result will be displayed to students.</strong></p>`
               + `<hr />`
               + `<h2>About You</h2>`
               + `<p>`
               + `<strong>Company:</strong> ${mentor['Company']}<br />`
               + `<strong>Role:</strong> ${mentor['Role']}<br />`
               + `<strong>Bio:</strong><br />${nl2br(mentor['Bio'])}<br />`
               + `<a href="${mentor.editRecordLink}">Edit</a></p>`
               + ``
               + `<h2>Your Project${projectPlural}</h2>`
               + mentor.Projects.map((project) => (
                 `<p>${nl2br(project.Description)}<br /><a href="${project.editRecordLink}">Edit</a></p>`
               ))
               + `<hr />`
               + `<p>---<br />Sincerely,<br />Robo-${mentor.Assignee.name.split(' ')[0]}</p>`;
    const bodyText = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });
    console.log(`    |- ${mentor.Name}`);

    sendEmail({
      From: from,
      To: to,
      ReplyTo: replyTo,
      Subject: subject,
      HtmlBody: body,
      TextBody: bodyText,
    });
    await mentorsTable.update([{ id: mentor.id, fields: { Status: 'Finalized' }}]);
  });
