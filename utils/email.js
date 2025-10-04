const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Enhanced email template for password reset
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .code {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          padding: 10px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 16px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Homoeopath Shala</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Hello,</h2>
          <p>You requested to reset your password for your Homoeopath Shala account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${options.resetURL}" class="button">Reset Your Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <div class="code">${options.resetURL}</div>
          <p><strong>This link will expire in 10 minutes.</strong></p>
          <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HomoeoPathshala. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message, // Plain text version
    html: htmlTemplate, // HTML version
  };

  try {
    // Verify transporter configuration
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    
    return result;
  } catch (error) {
    console.error('❌ ERROR SENDING EMAIL:', error);
    
    // More detailed error logging
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your Gmail credentials and App Password.');
    } else if (error.code === 'EENVELOPE') {
      console.error('Invalid email address or envelope configuration.');
    } else {
      console.error('Email sending error details:', error);
    }
    
    throw new Error('There was an error sending the email. Please try again later.');
  }
};

module.exports = sendEmail;