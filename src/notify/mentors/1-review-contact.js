const htmlToText = require('html-to-text');
const { sendEmail } = require('../../postmark');
const { mentorsTable } = require('../../airtable');

module.exports = (mentors) => mentors.filter((m) => m.Status === 'Reviewed' && m.Assignee !== null).forEach(async (mentor) => {
    const body = `<p>Hi ${mentor['First Name']}, thanks for applying to be a mentor at the CodeLabs virtual internship.</p>`
               + `<p>Your help is needed more than ever. Thousands of students have applied, and even prioritizing those`
               + ` for whom loss of internships will make the biggest difference, we're expecting that we'll need to`
               + ` reject 9 out of 10 qualified applicants due to a shortage of mentors.</p>`
               + `<p>To finalize your position as a mentor, we'd like to schedule a 10-15min phone call, to:</p>`
               + `<ul>`
               + `<li>Review the time commitment, and what CodeLabs will look like for you as a mentor.</li>`
               + `<li>Finalize the project you will be hosting. (If you didn't have any ideas, we'll help you brainstorm.)</li>`
               + `<li>Answer any questions you have about being a CodeLabs mentor.</li>`
               + `</ul>`
               + `<p><strong>You can find a time that works for both of us for this 10-15min call here:`
               + ` <a href="https://codeday.to/labsonboard">https://codeday.to/labsonboard</a></strong></p>`
               + `<p>Thank you again for volunteering your time, we really appreciate you!</p>`
               + `<p>---<br />The CodeDay Team<br />(Alex, Cora, Erika, Jake, James, Lola, Mingjie, Nik, Otto, and Tyler)</p>`;
    const bodyText = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });
    console.log(`    |- ${mentor.Name}`);

    sendEmail({
      From: `"CodeLabs" <${process.env.POSTMARK_FROM}>`,
      To: mentor.Email,
      Subject: `[Action Required] CodeLabs Mentoring Next Step`,
      HtmlBody: body,
      TextBody: bodyText,
    });
    await mentorsTable.update([{ id: mentor.id, fields: { Status: 'Contacted' }}]);
  });
