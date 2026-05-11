import { sendEmail } from "../sender";

export async function sendNewsletterConfirmation(email: string) {
  const encoded = encodeURIComponent(email);
  return sendEmail({
    to: email,
    subject: "Welcome to Social Perks",
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0C0F1A; color: #FAFBFD; margin: 0; padding: 40px 20px; }
  .container { max-width: 480px; margin: 0 auto; background: #161B2E; border-radius: 12px; padding: 32px; border: 1px solid #2A2F45; }
  h1 { font-family: Georgia, serif; font-style: italic; font-size: 28px; margin: 0 0 16px; color: #22D3EE; }
  p { line-height: 1.6; color: #C9D0E3; margin: 0 0 16px; }
  .cta { display: inline-block; background: #22D3EE; color: #0C0F1A; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
  .footer { font-size: 12px; color: #636B8A; margin-top: 32px; text-align: center; }
  a { color: #22D3EE; }
</style>
</head>
<body>
<div class="container">
  <h1>Welcome to Social Perks</h1>
  <p>Thanks for subscribing. You'll get one practical small-business marketing tip every Tuesday.</p>
  <p>Real strategies. Honest numbers. No fluff.</p>
  <p>In the meantime, want to see Social Perks in action?</p>
  <a href="https://socialperks.onrender.com/demo" class="cta">See the demo →</a>
  <div class="footer">
    Social Perks — AI marketing for small business<br>
    <a href="https://socialperks.onrender.com">socialperks.onrender.com</a><br>
    <small>You're receiving this because you subscribed at socialperks.onrender.com. <a href="https://socialperks.onrender.com/unsubscribe?email=${encoded}">Unsubscribe</a></small>
  </div>
</div>
</body>
</html>`
  });
}
