const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Get or initialize nodemailer transporter.
 * Supports standard SMTP (Resend, SendGrid, Amazon SES, Brevo, Postmark, Gmail)
 * or falls back to an Ethereal test account in development when SMTP credentials are not set.
 */
const getTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // 1. Check for configured SMTP credentials (supports Gmail service or custom SMTP)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const isGmail = 
      process.env.SMTP_SERVICE === 'gmail' ||
      (process.env.SMTP_HOST && process.env.SMTP_HOST.toLowerCase().includes('gmail')) ||
      (process.env.SMTP_USER && process.env.SMTP_USER.toLowerCase().endsWith('@gmail.com'));

    const transportConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        }
      : {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }
        };

    cachedTransporter = nodemailer.createTransport(transportConfig);

    console.log(`📧 Mailer initialized using ${isGmail ? 'Gmail service' : `SMTP host: ${process.env.SMTP_HOST}`} (${process.env.SMTP_USER})`);
    return cachedTransporter;
  }

  // 2. Local development fallback: create Ethereal test account automatically
  console.log('ℹ️  No custom SMTP configured. Provisioning Ethereal test account for real local delivery...');
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log(`📬 Ethereal test mailer ready. User: ${testAccount.user}`);
    return cachedTransporter;
  } catch (err) {
    console.error('❌ Failed to create Ethereal test account:', err.message);
    throw err;
  }
};

/**
 * Send an official email verification link to the voter.
 *
 * @param {Object} params
 * @param {string} params.to Recipient email address
 * @param {string} params.name Recipient full name
 * @param {string} params.token Raw cryptographically secure token (never the hash)
 */
const sendVerificationEmail = async ({ to, name, token }) => {
  const transporter = await getTransporter();

  const baseUrl = process.env.APP_URL || (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0].trim() : 'http://localhost:5173');
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const sender = process.env.EMAIL_FROM || '"EtherBallot Election Commission" <no-reply@etherballot.gov.in>';

  const subject = 'Action Required: Verify Your EtherBallot Voter Email Address';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
    .tricolor { height: 5px; background: linear-gradient(90deg, #ff9933 0%, #ff9933 33.33%, #ffffff 33.33%, #ffffff 66.66%, #138808 66.66%, #138808 100%); }
    .header { background: #1e3a8a; padding: 24px; text-align: center; color: #ffffff; }
    .org-title { font-size: 15px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
    .portal-title { font-size: 13px; color: #cbd5e1; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .text { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px; }
    .btn-wrapper { text-align: center; margin: 32px 0; }
    .btn { background: #2563eb; color: #ffffff !important; padding: 14px 32px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
    .btn:hover { background: #1d4ed8; }
    .callout { background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; font-size: 13px; color: #475569; margin: 24px 0; }
    .fallback-url { font-family: monospace; font-size: 12px; word-break: break-all; color: #2563eb; background: #eef2ff; padding: 10px; border-radius: 6px; border: 1px solid #c7d2fe; }
    .footer { background: #0f172a; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; line-height: 1.5; }
    .footer a { color: #cbd5e1; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="tricolor"></div>
    <div class="header">
      <div class="org-title">भारत निर्वाचन आयोग • Election Commission of India</div>
      <div class="portal-title">EtherBallot Decentralized Voter Infrastructure</div>
    </div>
    <div class="content">
      <div class="greeting">Namaste ${name || 'Citizen'},</div>
      <p class="text">
        Thank you for enrolling with <strong>EtherBallot</strong>. To secure your electoral identity and enable access to electronic ballot casting, please verify that you own this registered email address.
      </p>

      <div class="btn-wrapper">
        <a href="${verificationUrl}" class="btn" target="_blank" rel="noopener noreferrer">
          Verify Email Address →
        </a>
      </div>

      <div class="callout">
        <strong>⚠️ Security Advisory:</strong> This verification link will expire in <strong>30 minutes</strong>. If you did not initiate this enrollment, please disregard this email.
      </div>

      <p class="text" style="font-size: 13px; color: #64748b; margin-top: 24px;">
        If the button above does not open, copy and paste the link below directly into your web browser:
      </p>
      <div class="fallback-url">
        ${verificationUrl}
      </div>
    </div>
    <div class="footer">
      <div>© 2026 Election Commission of India / EtherBallot Sovereign Voting Project.</div>
      <div style="margin-top: 6px;">Nirvachan Sadan, Ashoka Road, New Delhi 110001 • National Voter Helpline: 1950</div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Namaste ${name || 'Citizen'},

Thank you for enrolling with EtherBallot. Please verify your email address to enable access to electronic ballot casting.

Click or open the following link to verify your email address:
${verificationUrl}

This verification link will expire in 30 minutes.

If you did not initiate this enrollment, please ignore this email.

© 2026 Election Commission of India / EtherBallot Project.
  `;

  const info = await transporter.sendMail({
    from: sender,
    to,
    subject,
    text,
    html
  });

  console.log(`✉️ Verification email dispatched to ${to} (MessageId: ${info.messageId})`);

  // If using Ethereal, log the preview URL for immediate inspection
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`🔗 Ethereal Email Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null
  };
};

/**
 * Send a 6-digit verification code (OTP) to the voter's email address.
 *
 * @param {Object} params
 * @param {string} params.to Recipient email address
 * @param {string} [params.name] Recipient name
 * @param {string} params.otp 6-digit numeric verification code
 */
const sendOtpEmail = async ({ to, name, otp }) => {
  const transporter = await getTransporter();
  const sender = process.env.EMAIL_FROM || '"EtherBallot Verification" <ehterballotproject@gmail.com>';
  const subject = `${otp} is your EtherBallot Voter Verification Code`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    .container { max-width: 520px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
    .tricolor { height: 5px; background: linear-gradient(90deg, #ff9933 0%, #ff9933 33.33%, #ffffff 33.33%, #ffffff 66.66%, #138808 66.66%, #138808 100%); }
    .header { background: #1e3a8a; padding: 22px; text-align: center; color: #ffffff; }
    .org-title { font-size: 14px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
    .portal-title { font-size: 12px; color: #cbd5e1; margin-top: 4px; }
    .content { padding: 32px 28px; text-align: center; }
    .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: left; }
    .text { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px; text-align: left; }
    .otp-card { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block; min-width: 260px; }
    .otp-label { font-size: 11px; font-weight: 800; color: #1e40af; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; }
    .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
    .advisory { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #92400e; text-align: left; margin: 24px 0 0; }
    .footer { background: #0f172a; color: #94a3b8; padding: 18px; text-align: center; font-size: 11px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="tricolor"></div>
    <div class="header">
      <div class="org-title">भारत निर्वाचन आयोग • Election Commission of India</div>
      <div class="portal-title">EtherBallot Decentralized Voter Verification</div>
    </div>
    <div class="content">
      <div class="greeting">Namaste ${name || 'Citizen'},</div>
      <p class="text">
        Here is your single-use verification code to authenticate your voter identity on the EtherBallot portal:
      </p>

      <div class="otp-card">
        <div class="otp-label">Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry">Expires in 5 minutes</div>
      </div>

      <div class="advisory">
        <strong>⚠️ Security Advisory:</strong> Never share this code with anyone. EtherBallot election officers will never request your verification code.
      </div>
    </div>
    <div class="footer">
      <div>© 2026 Election Commission of India / EtherBallot Project.</div>
      <div style="margin-top: 4px;">Nirvachan Sadan, Ashoka Road, New Delhi 110001</div>
    </div>
  </div>
</body>
</html>
  `;

  const text = `Namaste ${name || 'Citizen'},\n\nYour EtherBallot verification code is: ${otp}\n\nThis code expires in 5 minutes. Never share this code with anyone.\n\n© 2026 Election Commission of India / EtherBallot Project.`;

  const info = await transporter.sendMail({
    from: sender,
    to,
    subject,
    text,
    html
  });

  console.log(`✉️ Verification code [${otp}] dispatched to email: ${to} (MessageId: ${info.messageId})`);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`🔗 Email Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null
  };
};

module.exports = {
  sendVerificationEmail,
  sendOtpEmail,
  getTransporter
};
