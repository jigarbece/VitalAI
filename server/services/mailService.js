import fs from 'fs/promises';
import path from 'path';

async function appendToLog(logFile, entry) {
  await fs.mkdir(path.dirname(logFile), { recursive: true });
  let existing = [];
  try {
    const raw = await fs.readFile(logFile, 'utf-8');
    existing = JSON.parse(raw);
    if (!Array.isArray(existing)) existing = [];
  } catch (_err) {
    existing = [];
  }
  existing.push(entry);
  await fs.writeFile(logFile, JSON.stringify(existing, null, 2), 'utf-8');
}

function formatBody({ name, email, message }) {
  return `New VitalAI feedback message

From:    ${name}
Email:   ${email}
Sent at: ${new Date().toISOString()}

Message:
${'-'.repeat(40)}
${message}
${'-'.repeat(40)}
`;
}

export function createMailService({ transporter, mailTo, mailFrom, logFile } = {}) {
  if (!logFile) throw new Error('logFile is required for mailService');

  return {
    async sendContact({ name, email, message }) {
      const entry = {
        name,
        email,
        message,
        receivedAt: new Date().toISOString(),
      };

      let delivered = false;
      let deliveryError = null;
      if (transporter && typeof transporter.sendMail === 'function') {
        try {
          await transporter.sendMail({
            from: mailFrom || 'noreply@vitalai.local',
            to: mailTo || 'curiolightforyou@gmail.com',
            replyTo: email,
            subject: `VitalAI feedback from ${name}`,
            text: formatBody({ name, email, message }),
          });
          delivered = true;
        } catch (err) {
          deliveryError = err.message || 'mailer failed';
        }
      }

      // Always log to disk so we never lose a submission
      let logged = false;
      try {
        await appendToLog(logFile, { ...entry, delivered });
        logged = true;
      } catch (_err) {
        logged = false;
      }

      return { delivered, logged, deliveryError };
    },
  };
}

// Lazy default factory - builds a Gmail SMTP transporter if env vars are set,
// otherwise returns null (mail service falls back to log-only).
export async function buildDefaultTransporter(env = process.env) {
  if (!env.SMTP_HOST && !env.GMAIL_USER) return null;
  const nodemailer = (await import('nodemailer')).default;

  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}
