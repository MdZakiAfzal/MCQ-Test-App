// In utils/email.js
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  const msg = {
    to: options.email,
    from: process.env.EMAIL_FROM,
    subject: options.subject,
    text: options.message,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('ERROR 💥 SENDING EMAIL:', error);
    // Throw a custom, operational error
    throw new AppError('There was an error sending the email. Please try again later.', 500);
  }
};

module.exports = sendEmail;