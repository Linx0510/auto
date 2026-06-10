const nodemailer = require('nodemailer');
const config = require('../config');

async function sendPasswordResetEmail({ to, resetUrl }) {
  const from =
    config.mail.from ||
    config.app.contactEmail ||
    `"${config.app.name}" <noreply@localhost>`;

  if (!config.mail.enabled) {
    console.info(`[mail disabled] Password reset for ${to}: ${resetUrl}`);
    return;
  }

  if (!config.mail.host || !config.mail.user) {
    console.warn('[mail] SMTP_ENABLED is true but host/user missing; logging link instead.');
    console.info(`Password reset for ${to}: ${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass
    }
  });

  await transporter.sendMail({
    from,
    to,
    subject: `${config.app.name}: восстановление пароля`,
    text: `Перейдите по ссылке для нового пароля (действует ограниченное время):\n${resetUrl}`,
    html: `<p>Перейдите по ссылке для установки нового пароля:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}

module.exports = {
  sendPasswordResetEmail
};
