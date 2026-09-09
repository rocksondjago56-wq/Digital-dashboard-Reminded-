import nodemailer from 'nodemailer';

const isPlaceholder = (value = '') => /yourgmailaddress|replace-with|example\.edu\.gh/i.test(value);

export const isEmailDeliveryConfigured = () => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
    && !isPlaceholder(SMTP_HOST)
    && !isPlaceholder(SMTP_USER)
    && !isPlaceholder(SMTP_PASS);
};

export const getEmailDeliverySetupError = () => (
  'Email delivery is not configured. Add your Gmail address and Google App Password to server/.env, then restart the backend.'
);

export async function sendVerificationEmail({ to, name, code }) {
  if (!isEmailDeliveryConfigured()) {
    throw new Error(getEmailDeliverySetupError());
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'TTU Graphic Design Portal verification code',
      text: `Hello ${name}, your TTU portal verification code is ${code}. It expires in 15 minutes. If you did not request this, contact your department administrator.`
    });
  } catch (error) {
    console.error('Verification email delivery failed:', error.message);
    throw new Error('Gmail could not send the verification email. Check SMTP_USER and SMTP_PASS, then restart the backend.');
  }

  return { delivered: true };
}
