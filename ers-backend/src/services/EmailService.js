const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    // Create transporter with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // This should be an app password
      }
    });
  }
  
  async sendPasswordResetEmail(email, resetLink) {
    try {
      // Email template
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset - Employee Roster System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            <p>You recently requested to reset your password for your Employee Roster System account. Click the button below to reset it.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
            <p>This password reset link is only valid for the next 60 minutes.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #777; text-align: center;">Employee Roster System</p>
          </div>
        `
      };
      
      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

module.exports = new EmailService(); 