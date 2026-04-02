// ═══════════════════════════════════════════════════════════
// 📁 /lib/email-template-strings.ts — Inline HTML email templates
// Variables use {{UPPER_SNAKE_CASE}} and are replaced via fillTemplate()
// in EmailClient.ts
// ═══════════════════════════════════════════════════════════

export const TEMPLATE_GEN_COMPLETE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your content is ready — CreatorJot</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;padding:40px;max-width:560px;width:100%;">
      <tr><td style="padding-bottom:20px;">
        <span style="font-size:22px;font-weight:700;color:#13295f;letter-spacing:-0.5px;">CreatorJot</span>
      </td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:24px;"></td></tr>
      <tr><td>
        <h1 style="font-size:24px;font-weight:700;color:#09090b;margin:0 0 12px;line-height:1.3;">Your content is ready ✓</h1>
      </td></tr>
      <tr><td>
        <p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 20px;">
          Hey {{NAME}}, your <strong>{{PLATFORM}}</strong> post has been generated.
        </p>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <span style="display:inline-block;background-color:#f0f4ff;color:#13295f;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;border:1px solid rgba(19,41,95,0.18);">{{PLATFORM}}</span>
      </td></tr>
      <tr><td align="center" style="padding-bottom:28px;">
        <a href="{{CONTENT_URL}}" style="background-color:#13295f;color:#fff;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">View Your Post</a>
      </td></tr>
      <tr><td style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
        <p style="font-size:13px;line-height:1.6;color:#71717a;margin:0;">
          💡 <strong>Tip:</strong> Use the Hooks panel to regenerate with a different angle and get a fresh take on the same video.
        </p>
      </td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding:24px 0 0;"></td></tr>
      <tr><td>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">You're receiving this because you recently generated a post from the CreatorJot dashboard.</p>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">CreatorJot · <a href="mailto:support@creatorjot.com" style="color:#13295f;text-decoration:underline;">support@creatorjot.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

export const TEMPLATE_GEN_FAILED = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Content generation failed — CreatorJot</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;padding:40px;max-width:560px;width:100%;">
      <tr><td style="padding-bottom:20px;">
        <span style="font-size:22px;font-weight:700;color:#13295f;letter-spacing:-0.5px;">CreatorJot</span>
      </td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:24px;"></td></tr>
      <tr><td>
        <h1 style="font-size:24px;font-weight:700;color:#09090b;margin:0 0 12px;line-height:1.3;">Content generation failed</h1>
      </td></tr>
      <tr><td>
        <p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 20px;">
          We encountered an issue generating your <strong>{{PLATFORM}}</strong> content.
        </p>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <div style="background:#fff3cd;padding:15px;border-radius:8px;border-left:4px solid #ffc107;">
          <p style="font-size:14px;color:#52525b;margin:0;"><strong>Error:</strong> {{ERROR_MESSAGE}}</p>
        </div>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <p style="font-size:13px;color:#71717a;margin:0;"><strong>Job ID:</strong> {{JOB_ID}} &nbsp;|&nbsp; <strong>Time:</strong> {{TIMESTAMP}}</p>
      </td></tr>
      <tr><td align="center" style="padding-bottom:28px;">
        <a href="https://creatorjot.com/dashboard" style="background-color:#13295f;color:#fff;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">Go to Dashboard</a>
      </td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding:24px 0 0;"></td></tr>
      <tr><td>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">Please try again or contact <a href="mailto:support@creatorjot.com" style="color:#13295f;text-decoration:underline;">support@creatorjot.com</a> if the issue persists.</p>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">CreatorJot · <a href="mailto:support@creatorjot.com" style="color:#13295f;text-decoration:underline;">support@creatorjot.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

export const TEMPLATE_BATCH_COMPLETE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your content is ready — CreatorJot</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;padding:40px;max-width:560px;width:100%;">
      <tr><td style="padding-bottom:20px;">
        <span style="font-size:22px;font-weight:700;color:#13295f;letter-spacing:-0.5px;">CreatorJot</span>
      </td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding-bottom:24px;"></td></tr>
      <tr><td>
        <h1 style="font-size:24px;font-weight:700;color:#09090b;margin:0 0 12px;line-height:1.3;">{{JOB_COUNT}} pieces of content are ready ✓</h1>
      </td></tr>
      <tr><td>
        <p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 20px;">
          Your batch of generated posts is ready to view.
        </p>
      </td></tr>
      <tr><td style="padding-bottom:28px;">
        <ul style="list-style:none;padding:0;margin:0;">{{JOB_ITEMS}}</ul>
      </td></tr>
      <tr><td align="center" style="padding-bottom:28px;">
        <a href="https://creatorjot.com/dashboard" style="background-color:#13295f;color:#fff;padding:13px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">View All Posts</a>
      </td></tr>
      <tr><td style="border-top:1px solid #e4e4e7;padding:24px 0 0;"></td></tr>
      <tr><td>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">You're receiving this because you recently generated posts from the CreatorJot dashboard.</p>
        <p style="font-size:13px;color:#a1a1aa;margin:4px 0;">CreatorJot · <a href="mailto:support@creatorjot.com" style="color:#13295f;text-decoration:underline;">support@creatorjot.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
