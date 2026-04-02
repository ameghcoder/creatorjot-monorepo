/**
 * Email HTML templates for frontend use.
 * Fill {{placeholder}} tokens at send time.
 */

function fill(html: string, vars: Record<string, string>): string {
    return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const val = vars[key] ?? ''
        return val
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    })
}

// ── Welcome ───────────────────────────────────────────────

const WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Welcome to CreatorJot</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;padding:40px;max-width:560px;width:100%;">
      <tr><td style="padding-bottom:20px;"><span style="font-size:22px;font-weight:700;color:#13295f;letter-spacing:-0.5px;">CreatorJot</span></td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:24px;"></td></tr>
      <tr><td><h1 style="font-size:24px;font-weight:700;color:#09090b;margin:0 0 12px;line-height:1.3;">Welcome, {{name}} 👋</h1></td></tr>
      <tr><td><p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 20px;">You're in. CreatorJot turns your YouTube videos into ready-to-post content for X, LinkedIn, Facebook, email, and more — in seconds.</p></td></tr>
      <tr><td style="background-color:#e8ecf5;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
        <p style="font-size:14px;color:#3f3f46;margin:0 0 10px;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#13295f;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">1</span>Paste any YouTube video link</p>
        <p style="font-size:14px;color:#3f3f46;margin:0 0 10px;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#13295f;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">2</span>Pick your platforms and tone</p>
        <p style="font-size:14px;color:#3f3f46;margin:0;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#13295f;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:22px;margin-right:10px;">3</span>Get ready-to-post content instantly</p>
      </td></tr>
      <tr><td align="center" style="padding:28px 0;"><a href="https://creatorjot.com/dashboard" style="background-color:#13295f;color:#fff;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Start Generating</a></td></tr>
      <tr><td><p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 20px;">Your free account includes 2 generations per month — no credit card required.</p></td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:16px;"></td></tr>
      <tr><td>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">Questions? <a href="mailto:support@creatorjot.com" style="color:#13295f;text-decoration:underline;">support@creatorjot.com</a></p>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">CreatorJot · <a href="https://creatorjot.com" style="color:#13295f;text-decoration:underline;">creatorjot.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

// ── Pro Welcome ───────────────────────────────────────────

const PRO_WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>You're on Pro — CreatorJot</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;padding:40px;max-width:560px;width:100%;">
      <tr><td style="padding-bottom:20px;"><span style="font-size:22px;font-weight:700;color:#13295f;letter-spacing:-0.5px;">CreatorJot</span></td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:20px;"></td></tr>
      <tr><td style="padding-bottom:8px;"><span style="display:inline-block;background-color:#d4a017;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.12em;padding:4px 12px;border-radius:20px;">✦ PRO PLAN ACTIVE</span></td></tr>
      <tr><td><h1 style="font-size:24px;font-weight:700;color:#09090b;margin:12px 0;line-height:1.3;">You're on Pro, {{name}} 🎉</h1></td></tr>
      <tr><td><p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 24px;">Your upgrade is confirmed. You now have access to all premium platforms, higher generation limits, and priority processing.</p></td></tr>
      <tr><td style="background-color:#13295f;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;color:rgba(255,255,255,0.7);text-transform:uppercase;margin:0 0 4px;">Your monthly credits</p>
        <p style="font-size:48px;font-weight:800;color:#fff;margin:0;line-height:1;">{{credits}}</p>
        <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:6px 0 0;">Resets at the start of each billing cycle</p>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="font-size:14px;font-weight:600;color:#09090b;margin:0 0 2px;">✓ All platforms</p><p style="font-size:13px;color:#71717a;margin:0 0 12px;">X, LinkedIn, Facebook, Tumblr, Email, YT Community</p>
        <p style="font-size:14px;font-weight:600;color:#09090b;margin:0 0 2px;">✓ Videos up to 90 min</p><p style="font-size:13px;color:#71717a;margin:0 0 12px;">Process longer content without limits</p>
        <p style="font-size:14px;font-weight:600;color:#09090b;margin:0 0 2px;">✓ Priority queue</p><p style="font-size:13px;color:#71717a;margin:0 0 12px;">Your jobs are processed first</p>
        <p style="font-size:14px;font-weight:600;color:#09090b;margin:0 0 2px;">✓ Credit dashboard</p><p style="font-size:13px;color:#71717a;margin:0;">Full breakdown of usage in Settings → Billing</p>
      </td></tr>
      <tr><td align="center" style="padding-bottom:28px;"><a href="https://creatorjot.com/dashboard/generate" style="background-color:#13295f;color:#fff;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Start Generating</a></td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:16px;"></td></tr>
      <tr><td>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">Manage your subscription in <a href="https://creatorjot.com/dashboard/payments" style="color:#13295f;text-decoration:underline;">Settings → Billing</a></p>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;"><a href="mailto:support@creatorjot.com" style="color:#13295f;text-decoration:underline;">support@creatorjot.com</a> · <a href="https://creatorjot.com" style="color:#13295f;text-decoration:underline;">creatorjot.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

// ── Exports ───────────────────────────────────────────────

export function welcomeEmail(vars: { name: string }): string {
    return fill(WELCOME_HTML, vars)
}

export function proWelcomeEmail(vars: { name: string; credits: string }): string {
    return fill(PRO_WELCOME_HTML, vars)
}
