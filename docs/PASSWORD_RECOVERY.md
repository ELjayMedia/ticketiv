# Password recovery

## Flow

1. `/forgot-password` calls `resetPasswordForEmail` with `redirectTo=https://ticketiv.app/auth/confirm?next=/reset-password`.
2. The email link opens `/auth/confirm`. The route:
   - verifies `token_hash` + `type=recovery` server-side with `verifyOtp`; this works on any device or browser;
   - or, as a fallback for the default template, exchanges a PKCE `code`. That only works in the browser that requested the reset.
3. On success the user lands on `/reset-password` with a recovery session. The page checks the session on load before showing the form.
4. On failure (expired, already used, or opened in another browser with a PKCE link) the user is sent to `/forgot-password?error=recovery_link_invalid` with a plain-language message.
5. After `updateUser({ password })` the user is signed out and sent to `/login?message=password-reset`.

## Required Supabase configuration (dashboard)

**Authentication → Email Templates → Reset Password.** Replace `{{ .ConfirmationURL }}` with a token-hash link, so that reset links work when opened on a different device or inside an email app:

```html
<h2>Reset your Ticketiv password</h2>
<p>Follow this link to choose a new password. It works once and expires after one hour.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset password</a></p>
```

**Authentication → URL Configuration.**
- Site URL: `https://ticketiv.app`.
- Redirect URLs include `https://ticketiv.app/auth/confirm**` and `https://ticketiv.app/auth/callback**`, plus preview domains if previews must work.

**Authentication → SMTP Settings.** Use a custom SMTP provider (Resend on `ticketiv.app`, TICK-180). The built-in Supabase mailer is rate-limited and not meant for production.

## Verifying

- Supabase marks a sent reset in `auth.users.recovery_sent_at`. Supabase returns HTTP 200 from `/recover` even for unknown addresses, so a 200 alone does not prove an email was sent.
- Test cross-device: request a reset on a laptop and open the email on a phone. You should land on "Set a new password".
- Unit coverage: `app/auth/confirm/route.test.ts`.
