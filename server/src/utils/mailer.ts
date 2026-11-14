/*
 * LEARNING NOTE: Nodemailer helper: centralizes SMTP configuration and isolates email delivery errors.
 * Interview tip: describe the input, validation, side effects, and failure path.
 */
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Reusable transport: credentials come from environment variables, not committed source code.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const mailOptions = {
      from: `"ATS System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };
    // Email is a side effect; failures are logged here rather than crashing the main request flow.
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
  }
};
