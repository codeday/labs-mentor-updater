const { foreign, getAttachment, downloadLink } = require('../cognito');
const { geocode } = require('../utils');
const Uploader = require('@codeday/uploader-node');
const upload = new Uploader(process.env.UPLOADER_URL);

module.exports = async ({ StudentApplication: applications, ...sheets }) => {
  const applicationsFull = [
    'AdvancedTrackQuestions_IfYouHav',
    'AreThereAnyUniversitiesYoudPart',
    'AreThereAnyCompaniesYoudParticu'
  ].reduce((accum, sheetName) => foreign(sheetName, accum, sheets[sheetName], 'StudentApplication_Id'), applications);

  const applicationsGeo = await Promise.all(applicationsFull.map(async (app) => ({
    ...app,
    growUpLocation: await geocode(app.WhereDidYouGrowUp),
    location: await geocode(app.PostalCode),
  })));

  // Upload resumes
  const applicationsUploads = await Promise.all(applicationsGeo
    .map(async ({ AdvancedTrackQuestions_IfYouHav: resume, ...rest }) => {
      if (resume.length === 0) return {...rest, Resume: null};
      const resumeFile = await getAttachment(resume[0].Id, resume[0].ContentType);
      const exts = { 'application/msword': 'doc', 'application/pdf': 'pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' };
      const ext = (resume[0].ContentType in exts) ? exts[resume[0].ContentType] : 'bin';
      const { url } = await upload.file(resumeFile.data, `resume.${ext}`);

      return {
        ...rest,
        Resume: url,
      };
    })
  );

  return applicationsUploads
    // Merge beginner and advanced track questions
    .map((app) => ({
      ...app,
      StudentType: app.BeginnerTrackQuestions_WhichTypeOfStudentAreYou || app.AdvancedTrackQuestions_WhichTypeOfStudentAreYou,
      SchoolName: app.BeginnerTrackQuestions_WhatsYourSchoolName || app.AdvancedTrackQuestions_WhatsYourSchoolName,
      Prior: app.BeginnerTrackQuestions_WhichOfTheseHaveYouDoneBefore || app.AdvancedTrackQuestions_WhichOfThseHaveYouDoneBefore,
      Project: app.BeginnerTrackQuestions_TellUsAboutSomethingYoureProudOfMakingInThePast || app.AdvancedTrackQuestions_TellUsAboutAProjectYouWorkedOnInThePast,
      AnythingElse: app.BeginnerTrackQuestions_Text || app.AdvancedTrackQuestions_AnythingElseYoudLikeUsToKnowAboutYourInterestOrExperienceInCSAndCoding,
    }))

    // Remap field names
    .map((app) => ({
      'First Name': app.Name_First,
      'Last Name': app.Name_Last,
      'Email': app.Email,
      'Status': 'Applied',
      'Track': (app.Track === 'Beginner Track' || app.Track === 'Apply for the Beginner Track.') ? 'Beginner' : 'Advanced',
      'Interests': (app.AdvancedTrackQuestions_WhichSubjectsAreYouInterestedIn || app.BeginnerTrackQuestions_Choice || '')
        .split(', ')
        .map((interest) => ({
          'Web design': 'Web Dev',
          'Complex website programming (e.g. connecting to a database)': 'Backend',
          'Making games': 'Games',
          'Electronics projects': 'Electronics',
          'Robotics' : 'Robotics',
          'Mobile apps': 'Mobile',
          'Web Development': 'Web Dev',
          'Mobile (App) Development': 'Mobile',
          'Frontend UI (Desktop/Web) Development': 'Frontend',
          'Services (Server) Development': 'Services',
          'Backend (Server) Development': 'Backend',
          'Electronics': 'Electronics',
          'CS Research': 'Research',
          'Science + Programming (e.g. Biotech)': 'Sciences',
          'Health + Programming': 'Health',
          'AI': 'AI',
          'Cryptography (including Cryptocoins, Blockchain)': 'Cryptography',
          'Game Development': 'Games',
          'Data Science (Visualization, Databases, Big Data)': 'Data',
          'OS Development': 'OS',
          'Human Computer Interaction and User Experience': 'HCI/UX',
        }[interest || '']))
        .filter((a) => a),
      'Student Type': {
        '': null,
        'High School': 'High School',
        'Trade School': 'Trade School',
        'College/University Undergrad': 'Undergraduate',
        'College/University Undergraduate': 'Undergraduate',
        'Recently graduated': 'Graduate',
      }[app.StudentType || ''],
      'School': app.SchoolName,
      'Prior Experience': app.Prior,
      'Past Project': app.Project,
      'Anything Else': app.AnythingElse,
      'LinkedIn': app.AdvancedTrackQuestions_IfYouHaveALinkedInProvideTheLink,
      'Resume': app.Resume,
      'Time Commitment': {
        '': '10hr',
        'At least 10 hours a week (1-2 hours a day)': '10hr',
        'At least 20 hours a week (part-time job equivilant)': '20hr',
        'At least 30 hours a week (full-time job equivilant)': '30hr',
      }[app.HowMuchTimeAreYouAbleToCommitToCodeDayLabs || '10hr'],
      'Interested Companies': app.AreThereAnyCompaniesYoudParticu.map((company) => company.CompanyName).join(','),
      'Interested Schools': app.AreThereAnyUniversitiesYoudPart.map((school) => school.UniversityName).join(','),
      'Underrepresented': app.WhatsYourPreferredPronoun !== 'he/him'
        || ['Black', 'Latino/a', 'Native American'].includes(app.WithWhichEthnicityDoYouMostIdentify),
      'Pronoun': app.WhatsYourPreferredPronoun,
      'Ethnicity': app.WithWhichEthnicityDoYouMostIdentify,
      'Rural': app.growUpLocation.rural,
      'Postal Code': app.PostalCode,
      'Timezone': app.location.tz,
      'Parent Contact': !app.ParentContactInformation_ParentName_First ? null : `${app.ParentContactInformation_ParentName_First} ${app.ParentContactInformation_ParentName_Last}\n${app.ParentContactInformation_ParentEmail}\n${app.ParentContactInformation_ParentPhone}`,
      'Cognito ID': app.StudentApplication_Id,
    }))
}
