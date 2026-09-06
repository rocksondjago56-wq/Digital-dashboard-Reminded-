import nodemailer from 'nodemailer';

export async function sendVerificationEmail({ to, name, code }) {
  const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    return { delivered: false, developmentCode: process.env.NODE_ENV === 'production' ? undefined : code };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'TTU Graphic Design Portal verification code',
    text: `Hello ${name}, your TTU portal verification code is ${code}. It expires in 15 minutes. If you did not request this, contact your department administrator.`
  });

  return { delivered: true };
}
