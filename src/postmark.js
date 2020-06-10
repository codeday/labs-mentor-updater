const Postmark = require('postmark');
const postmark = new Postmark.ServerClient(process.env.POSTMARK_KEY);

module.exports.sendEmail = async (config) => {
  try {
    await postmark.sendEmail(config);
  } catch (err) {
    console.error(err);
  }
}
