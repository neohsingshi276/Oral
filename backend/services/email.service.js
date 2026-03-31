const axios = require('axios');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const brevoHeaders = {
  'api-key': process.env.BREVO_API_KEY,
  'Content-Type': 'application/json',
};

// ============================================
// Send OTP Email (Forgot Password)
// ============================================
const sendOTPEmail = async (toEmail, otp, adminName) => {
  await axios.post(BREVO_API_URL, {
    sender: { name: 'DentalQuest', email: process.env.BREVO_SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: 'DentalQuest — Password Reset OTP',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e2e8f0;border-radius:16px;">
        <h1 style="color:#1e3a5f;text-align:center;">🦷 DentalQuest</h1>
        <h2 style="color:#1e3a5f;">Password Reset Request</h2>
        <p style="color:#475569;">Hi <strong>${adminName}</strong>,</p>
        <p style="color:#475569;">Use the OTP code below to reset your password:</p>
        <div style="background:#1e3a5f;border-radius:12px;padding:2rem;text-align:center;margin:1.5rem 0;">
          <div style="color:#FFD700;font-size:3rem;font-weight:900;letter-spacing:1rem;">${otp}</div>
          <p style="color:#93c5fd;margin:0.5rem 0 0;font-size:0.9rem;">This code expires in 10 minutes</p>
        </div>
        <p style="color:#475569;">If you did not request this, please ignore this email.</p>
        <p style="color:#94a3b8;font-size:0.82rem;text-align:center;">DentalQuest — Oral Health Education Programme</p>
      </div>
    `,
  }, { headers: brevoHeaders });
};

// ============================================
// Send Invite Email (New Admin)
// ============================================
const sendInviteEmail = async (toEmail, inviteLink) => {
  await axios.post(BREVO_API_URL, {
    sender: { name: 'DentalQuest', email: process.env.BREVO_SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: 'You have been invited to DentalQuest Admin Portal!',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e2e8f0;border-radius:16px;">
        <h1 style="color:#1e3a5f;text-align:center;">🦷 DentalQuest</h1>
        <h2 style="color:#1e3a5f;">You're Invited! 🎉</h2>
        <p style="color:#475569;">You have been invited to join the <strong>DentalQuest Oral Health Education Programme</strong> as an Admin.</p>
        <p style="color:#475569;">Click the button below to set up your account:</p>
        <div style="text-align:center;margin:2rem 0;">
          <a href="${inviteLink}" style="background:#2563eb;color:#fff;padding:1rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;font-size:1rem;display:inline-block;">
            ✅ Accept Invitation & Set Up Account
          </a>
        </div>
        <p style="color:#94a3b8;font-size:0.82rem;">This invitation link expires in <strong>7 days</strong>.</p>
        <p style="color:#94a3b8;font-size:0.78rem;">If you cannot click the button, copy this link: ${inviteLink}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;">
        <p style="color:#94a3b8;font-size:0.82rem;text-align:center;">DentalQuest — Oral Health Education Programme</p>
      </div>
    `,
  }, { headers: brevoHeaders });
};

// ============================================
// Send Reminder Email (Admin to Admin)
// ============================================
const sendReminderEmail = async (toEmail, adminName, subject, message, fromName) => {
  await axios.post(BREVO_API_URL, {
    sender: { name: 'DentalQuest', email: process.env.BREVO_SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: `DentalQuest: ${subject}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;border:1px solid #e2e8f0;border-radius:16px;">
        <h1 style="color:#1e3a5f;text-align:center;">🦷 DentalQuest</h1>
        <h2 style="color:#1e3a5f;">${subject}</h2>
        <p style="color:#475569;">Hi <strong>${adminName}</strong>,</p>
        <div style="background:#f8fafc;border-radius:12px;padding:1.5rem;margin:1.5rem 0;border-left:4px solid #2563eb;white-space:pre-wrap;color:#334155;line-height:1.6;">${message}</div>
        <p style="color:#94a3b8;font-size:0.82rem;">From: ${fromName} via DentalQuest Portal</p>
        <p style="color:#94a3b8;font-size:0.82rem;text-align:center;">DentalQuest — Oral Health Education Programme</p>
      </div>
    `,
  }, { headers: brevoHeaders });
};

module.exports = { sendOTPEmail, sendInviteEmail, sendReminderEmail };
