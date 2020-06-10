const htmlToText = require('html-to-text');
const { sendEmail } = require('../../postmark');
const { mentorsTable } = require('../../airtable');
const { nl2br } = require('../../utils');

const sendMentorInfo = (mentor, project) => {
  console.log(`      |- ${mentor.Name} Mentor Info`);

  const extended = project.Team.filter((student) => student['Extended Internship']);

  const from = `CodeLabs <${process.env.POSTMARK_FROM}>`;
  const to = `"${mentor.Name}" <${mentor.Email}>`;
  const subject = `CodeLabs Team Bios: ${project.Team.map((student) => student.Name).join(', ')}`;
  const body =
      `<p>Meet your CodeLabs team: ${project.Team.map((student) => student.Name).join(', ')}, and you!</p>`
    + `<p>We've completed matching for your CodeLabs project, and have placed ${project.Team.length} students on your`
    + ` team. Below, we've included a details about your team, including your original project description and`
    + ` background information about each of your students.</p>`
    + `<h1>Your Commitment To Your Team</h1>`
    + `<p>As a reminder, you have committed to the following for your mentees:</p>`
    + `<ul>`
    + `<li>Two, one-hour group meetings each week during CodeLabs.</li>`
    + `<li>Two-to-three, 15-30 minute one-on-one meetings with each mentee at some point during CodeLabs.</li>`
    + `<li>Fill out a weekly evaluation telling us how things are going.</li>`
    + `</ul>`
    + (extended.length === 0 ? '' : (
        `<p><strong>The following students require 10 weeks of meetings for college credit:`
      + ` ${extended.map((student) => student.Name).join(', ')}`
      + ` </strong> That means, outside of the core program from July 6-31, you will need to continue to meet at least`
      + ` once a week to supervise their progress. (You may need to add additional tasks to account for this additional`
      + ` time. We encourage you to wait until necessary.)</p>`
    ))
    + `<h1>What's Next?</h1>`
    + `<p>We just sent you a separate introduction email with your team members.</p>`
    + `<p><strong>Your next step is to schedule an kickoff meeting with your team.</strong> We recommend you use a tool`
    + ` like <a href="https://doodle.com/">Doodle</a> to set up this meeting. You can use any conferencing system you`
    + ` are familiar with (we recommend Google Meet)!</p>`
    + `<p>OPTIONAL: If you would like to discuss any final questions or concerns before your kickoff call, you can`
    + ` <a href="https://codeday.to/codelabs-mentor-advice">set up a meeting.</a></p>`
    + `<p>For more information, and a suggested welcome message you can copy-paste, see the`
    + ` <a href="https://codeday.to/codelabs-training">mentor training</a></p>`
    + `<p>If you need any help, you can reach out to our co-mentor managers:</p>`
    + `<ul>`
    + `<li>Alex Parra: alexparra@srnd.org or 888-607-7763 ext 5033</li>`
    + `<li>Mingjie Jiang: mingjie@srnd.org or 888-607-7763 ext 5014</li>`
    + `</ul>`
    + `<h1>Your Project</h1>`
    + `<p><blockquote>${nl2br(project.Description)}</blockquote></p>`
    + `<h1>Your Mentees</h1>`
    + project.Team.map((student) =>
        `<h2>${student.Name}</h2>`
      + `<p><strong>Email:</strong> ${student.Email}</p>`
      + `<p><strong>LinkedIn:</strong> ${student.LinkedIn}</p>`
      + `<p><strong>Resume:</strong> ${student.Resume}</p>`
      + `<p><strong>Time Commitment:</strong> ${student['Time Commitment']} per week</p>`
      + `<p><strong>Interests:</strong> ${student.Interests.join(', ')}</p>`
      + `<p><strong>School:</strong> ${student.School} (${student['Student Type']})</p>`
      + `<p><strong>Prior Experience:</strong> ${student['Prior Experience']}</p>`
      + `<p><strong>Past Project:</strong></p>`
      + `<p><blockquote>${nl2br(student['Past Project'])}</blockquote></p>`
      + `<p><strong>More Details:</strong></p>`
      + `<p><blockquote>${nl2br(student['Anything Else'])}</blockquote></p>`
    )
    + `<hr>`
    + `<p>---<br />The CodeLabs Team</p>`;

  const bodyText = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });

  sendEmail({
    From: from,
    To: to,
    Subject: subject,
    HtmlBody: body,
    TextBody: bodyText,
  });
}

sendStudentInfo = (student, mentor, project) => {
  console.log(`      |- ${student.Name} Student Info`);
  const from = `CodeLabs <${process.env.POSTMARK_FROM}>`;
  const to = `"${student.Name}" <${student.Email}>`
  const subject = `Your CodeLabs Mentor: ${mentor.Name}`;
  const body =
      `<p>Your CodeLabs group will be mentored by <strong>${mentor.Name}</strong> and include students:`
    + ` ${project.Team.map((student) => student.Name).join(', ')}. We sent you a separate introduction email.</p>`
    + `<p>This email contains more information just for you, ${student.Name}.</p>`
    + `<h1>What To Expect From Your Mentor</h1>`
    + `<ul>`
    + `<li>Two, one-hour group meetings each week during CodeLabs, where you'll review progress and get help.</li>`
    + `<li>Two-to-three, 15-30 minute one-on-one meetings at some point during CodeLabs.</li>`
    + `</ul>`
    + `<p><strong>Your mentor is NOT there to write code with you.</strong> Think of your mentor as your manager:`
    + ` their job is to provide guidance on tech stack, architecture, and high-level tech problems; and to review`
    + ` your progress.</p>`
    + `<h1>What We Expect From You</h1>`
    + `<ul>`
    + `<li>Be available to schedule meetings during the day in your local timezone.</li>`
    + `<li>Show up on-time to your scheduled meetings. If you can't make it, communicate early.</li>`
    + `<li>Be self-sufficient in making progress. Seek out answers to problems, don't wait for your next meeting.</li>`
    + `<li>Be a good, reliable teammate.</li>`
    + `<li>Put the ${student['Time Commitment']}/week into your project which you committed to when you applied.</li>`
    + `</ul>`
    + `<p>If you meet these expectations, your mentor will complete an evaluation of you at the end of the program, and`
    + ` in most cases will provide a positive reference for future employers.</p>`
    + `<h1>More CodeLabs Resources</h1>`
    + `<p><strong>During the month of July, we're hosting daily activities.</strong> You'll get an email with the`
    + ` schedule at the start of every week, as well as regular reminders. You can also check the schedule at`
    + ` <a href="https://labs.codeday.org/">labs.codeday.org</a>.`
    + `<p><strong>If you need detailed coding help:</strong> we have a team of tech mentors who can help at any`
    + ` time, so you don't have to wait for your next meeting. Please join our Discord server at`
    + ` <a href="https://codeday.to/discord">https://codeday.to/discord</a> and post any questions in #help-desk.`
    + ` This is the fastest way to get help, and we strongly recommend you take advantage of it.</p>`
    + `<h1>About ${mentor['First Name']}</h1>`
    + `<p><blockquote>${mentor.Bio}</blockquote></p>`
    + `<h1>Your Project</h1>`
    + `<p><blockquote>${nl2br(project.Description)}</blockquote></p>`
    + `<hr>`
    + `<p>---<br />The CodeLabs Team</p>`

  const bodyText = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });

  sendEmail({
    From: from,
    To: to,
    Subject: subject,
    HtmlBody: body,
    TextBody: bodyText,
  });
}

const sendGroupIntro = (mentor, project) => {
  console.log(`      |- Group Introduction`);
  const from = `CodeLabs <${process.env.POSTMARK_FROM}>`;
  const to = [
    `"${mentor.Name}" <${mentor.Email}>`,
    ...project.Team.map((student) => `"${student.Name}" <${student.Email}>`)
  ].join(', ');
  const subject = `CodeLabs Intro - ${mentor.Name} <> ${project.Team.map((student) => student.Name).join('/')}`;
  const body =
      `<p>Meet your CodeLabs team: ${project.Team.map((student) => student.Name).join(', ')}, and mentor ${mentor.Name}!</p>`
    + `<p><strong>Your first step is to schedule a kickoff meeting.</strong>`
    + ` In this meeting, you should expect to cover:</p>`
    + `<ul>`
    + `<li>Introductions</li>`
    + `<li>The project vision</li>`
    + `<li>The project scope, tech stack, and architecture</li>`
    + `<li>Task management and check-in expectations</li>`
    + `</ul>`
    + `<p><strong>It's up to you to schedule this meeting.</strong> But don't hesitate to reach out with any questions`
    + ` or concerns. MAKE SURE TO PAY ATTENTION TO TIMEZONES WHEN SCHEDULING. You're all in a similar timezone, but`
    + ` not necessarily the same timezone.</p>`
    + `<h1>Your Project</h1>`
    + `<p><blockquote>${nl2br(project.Description)}</blockquote></p>`
    + `<hr>`
    + `<p>---<br />The CodeLabs Team</p>`

  const bodyText = htmlToText.fromString(body, { wordwrap: 100, noLinkBrackets: true });

  sendEmail({
    From: from,
    To: to,
    Subject: subject,
    HtmlBody: body,
    TextBody: bodyText,
  });
}

module.exports = (mentors) => mentors
  .filter((m) => m.Status === 'Matched')
  .forEach((mentor) => mentor.Projects.forEach(async (project) => {
    console.log(`    |- ${project.Name}`);
    project.Team.forEach((student) => sendStudentInfo(student, mentor, project));
    sendMentorInfo(mentor, project);
    sendGroupIntro(mentor, project);

    await mentorsTable.update([{ id: mentor.id, fields: { Status: 'Introduced' }}]);
  }));
