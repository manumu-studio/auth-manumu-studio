# Verify Route

`page.tsx` reads the normalized email and optional OAuth `callbackUrl`, then
renders `OtpVerificationForm`.

On success, `/api/auth/verify` marks the email verified, creates a NextAuth JWT
session cookie, and the client performs a full-page redirect to the callback or
dashboard.
