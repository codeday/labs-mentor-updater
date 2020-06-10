const { foreign } = require('../cognito');
const { geocode } = require('../utils');

const aAn = (str) => {
  if (!str || str.length === 0) return '';
  return ['a', 'e', 'i', 'o', 'u'].includes(str.toLowerCase()[0]) ? 'an' : 'a';
}

const makeBio = (app) => {
  return `${app.Name_First} is ${aAn(app.Section_WhatsYourRoleAtWork)} ${app.Section_WhatsYourRoleAtWork} with`
        + ` ${app.Section_HowManyYearsOfExperienceDoYouHave} years of experience, working on`
        + ` ${app.Section_WhatTypeOfIndustryDoYouWorkIn} at ${app.Section_WhichCompanyDoYouWorkFor}.`
        + ` They grew up in ${app.WhereDidYouGrowUp}.`
        + (!app.LinkedInProfile ? '' : ` Learn more about them on their LinkedIn: ${app.LinkedInProfile}`);
}

const makeProjects = (app) => {
  const projects = [];
  if (app.FirstProjectProposal) {
    projects.push({
      Description: app.FirstProjectProposal,
      Tags: (app.TagThisProject || '').split(', ').filter((a) => a),
      Students: 3,
    });
  }

  if (app.SecondProjectProposal) {
    projects.push({
      Description: app.SecondProjectProposal,
      Tags: (app.TagThisProject2 || '').split(', ').filter((a) => a),
      Students: 3,
    });
  }

  return projects;
}

module.exports = async ({ CodeLabsMentorApplication, YourEducation: education }) => {
  const applications = foreign('YourEducation', CodeLabsMentorApplication, education, 'CodeLabsMentorApplication_Id');

  const applicationsGeo = await Promise.all(applications.map(async (app) => ({
    ...app,
    growUpLocation: await geocode(app.WhereDidYouGrowUp),
  })));

  return applicationsGeo.map((app) => ({
    'Status': 'Submitted',
    'Track': app.BeginnerTeam === 'Yes' ? 'Beginner' : 'Advanced',
    'First Name': app.Name_First,
    'Last Name': app.Name_Last,
    'Email': app.Email,
    'Host Multiple Projects': app.ByDefaultWeWillPickONEProjectProposalbasedOnStudentInterestIfYouWouldLikeToHostStudentGroupsForBOTHProjectsCheckThisBox === 'Yes',
    'Role': app.Section_WhatsYourRoleAtWork,
    'Company': app.Section_WhichCompanyDoYouWorkFor,
    'Bio': makeBio(app),
    'Projects': makeProjects(app),
    'Background Rural': app.growUpLocation.rural,
    'Prefer Underrepresented Students': `${Math.max(0, Number.parseInt(app.RatingScale_IsAMemberOfAGroupUnderrepresentedInTechnology_Rating)-1)}`,
    'Prefer Existing Knowledge': Number.parseInt(app.RatingScale_PreexistingExperienceWithTheToolsframeworkslanguagesIUse_Rating) > 2,
    'OK Extended Internship': app.OkLengthyInternship === 'Yes',
    'OK Timezone Difference': app.OkTimezoneDifference === 'Yes',
    'Timezone': {
      '': null,
      'America - Hawaii': -10,
      'America - Alaska': -8,
      'America - Pacific': -7,
      'America - Mountain': -6,
      'America - Central': -5,
      'America - Eastern': -4,
      'America - Atlantic': -3,
    }[app.Choice3 || ''],
    'Cognito ID': app.CodeLabsMentorApplication_Id,
  }));
}
