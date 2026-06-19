# OTP Verification

- `createToken.ts` generates a six-digit code and stores a SHA-256 hash.
- `consumeToken.ts` validates code, expiry, and attempt count.
- `resend.ts` applies cooldown and sends a replacement code.
- `templates/` contains Resend email content.

Bare SHA-256 storage is a known security gap. Phase 0 replaces it with keyed
HMAC storage.
