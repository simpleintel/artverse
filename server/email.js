import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  } else {
    // Dev fallback — logs to console
    transporter = {
      sendMail: async (opts) => {
        console.log('\n📧 ─── EMAIL (dev mode) ───');
        console.log(`   To: ${opts.to}`);
        console.log(`   Subject: ${opts.subject}`);
        console.log(`   Code: ${opts.text?.match(/\d{6}/)?.[0] || '(see body)'}`);
        console.log('───────────────────────────\n');
        return { messageId: 'dev-' + Date.now() };
      },
    };
    console.log('⚠️  No email config found — verification codes will print to console');
  }

  return transporter;
}

export async function sendVerificationEmail(to, code) {
  const from = process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@artverse.dev';

  await getTransporter().sendMail({
    from: `ArtVerse <${from}>`,
    to,
    subject: 'Verify your ArtVerse account',
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't create an ArtVerse account, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #7c3aed, #ec4899); border-radius: 16px; padding: 14px; margin-bottom: 12px;">
            <span style="color: white; font-size: 24px;">✦</span>
          </div>
          <h1 style="margin: 0; font-size: 22px; color: #111827;">Verify your email</h1>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
          Enter this code in ArtVerse to verify your account:
        </p>
        <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; letter-spacing: 8px;">
          <span style="font-size: 32px; font-weight: 800; color: #7c3aed;">${code}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This code expires in 15 minutes.
        </p>
      </div>
    `,
  });
}
