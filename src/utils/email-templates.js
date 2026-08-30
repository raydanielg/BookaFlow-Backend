function welcomeEmailTemplate({ fullName, businessName, bookingLink, frontendUrl }) {
  const dashboardUrl = `${frontendUrl}/dashboard`
  const fullBookingUrl = `${frontendUrl}${bookingLink}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BookMiadi</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e7f76 0%,#1a6b62 100%);padding:40px 40px 32px;text-align:center;">
              <img src="https://bookmiadi-web.vercel.app/peercoin.png" alt="BookMiadi" width="48" height="48" style="border-radius:12px;margin:0 auto 16px;display:block;" />
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-0.5px;">Welcome to BookMiadi</h1>
              <p style="color:rgba(255,255,255,0.8);font-size:15px;margin:0;">Your booking platform is ready to go</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h2 style="color:#18181b;font-size:20px;font-weight:600;margin:0 0 16px;">Hi ${fullName},</h2>
              <p style="color:#52525b;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Welcome to BookMiadi! Your account for <strong style="color:#18181b;">${businessName}</strong> has been created successfully.
                You're now ready to start managing your appointments, staff, and customers — all in one place.
              </p>

              <!-- Quick Start Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#f4f4f5;border-radius:12px;padding:24px;margin-bottom:12px;">
                    <p style="color:#1e7f76;font-size:13px;font-weight:600;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Step 1</p>
                    <p style="color:#18181b;font-size:15px;font-weight:600;margin:0 0 4px;">Set up your services</p>
                    <p style="color:#71717a;font-size:14px;margin:0;">Add the services you offer, pricing, and duration.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f4f4f5;border-radius:12px;padding:24px;margin-bottom:12px;">
                    <p style="color:#1e7f76;font-size:13px;font-weight:600;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Step 2</p>
                    <p style="color:#18181b;font-size:15px;font-weight:600;margin:0 0 4px;">Add your staff</p>
                    <p style="color:#71717a;font-size:14px;margin:0;">Invite team members and assign them to services.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f4f4f5;border-radius:12px;padding:24px;">
                    <p style="color:#1e7f76;font-size:13px;font-weight:600;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Step 3</p>
                    <p style="color:#18181b;font-size:15px;font-weight:600;margin:0 0 4px;">Share your booking link</p>
                    <p style="color:#71717a;font-size:14px;margin:0 0 12px;">Customers can book online anytime — no account needed.</p>
                    <p style="margin:0;">
                      <a href="${fullBookingUrl}" style="color:#1e7f76;font-size:14px;font-weight:500;text-decoration:none;word-break:break-all;">${fullBookingUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#1e7f76;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;">
              <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0 0 12px;">
                Need help? Reply to this email or contact us at
                <a href="mailto:info@lipasalama.co.tz" style="color:#1e7f76;text-decoration:none;">info@lipasalama.co.tz</a>
              </p>
              <p style="color:#a1a1aa;font-size:12px;margin:0 0 8px;">
                <a href="${frontendUrl}" style="color:#a1a1aa;text-decoration:none;">BookMiadi</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/terms" style="color:#a1a1aa;text-decoration:none;">Terms</a>
                &nbsp;·&nbsp;
                <a href="${frontendUrl}/privacy" style="color:#a1a1aa;text-decoration:none;">Privacy</a>
              </p>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} BookMiadi. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function welcomeEmailText({ fullName, businessName, bookingLink, frontendUrl }) {
  const dashboardUrl = `${frontendUrl}/dashboard`
  const fullBookingUrl = `${frontendUrl}${bookingLink}`

  return `Welcome to BookMiadi!

Hi ${fullName},

Your account for ${businessName} has been created successfully.
You're now ready to start managing your appointments, staff, and customers — all in one place.

Quick Start:
1. Set up your services — Add the services you offer, pricing, and duration.
2. Add your staff — Invite team members and assign them to services.
3. Share your booking link — Customers can book online anytime.
   Your booking link: ${fullBookingUrl}

Go to your dashboard: ${dashboardUrl}

Need help? Contact us at info@lipasalama.co.tz

© ${new Date().getFullYear()} BookMiadi. All rights reserved.
${frontendUrl}`
}

module.exports = { welcomeEmailTemplate, welcomeEmailText }
