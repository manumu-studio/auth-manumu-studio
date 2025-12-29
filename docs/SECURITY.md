# Security Documentation

**Manumu Studio Authentication** implements industry-standard security practices to protect user data and prevent common authentication vulnerabilities.

---

## Authentication Strategy

### Multi-Provider Authentication

- **Credentials (Email/Password)**: Traditional email/password authentication with email verification
- **OAuth Providers**: GitHub, Google (with more providers easily added)
- **Account Linking**: Automatic linking by email address when emails match

### Email Verification

- **Required for Credentials**: Users cannot sign in with email/password until email is verified
- **Optional for OAuth**: OAuth providers verify email ownership, so verification is trusted
- **Token-Based**: Cryptographically secure tokens with configurable TTL

---

## Password Security

### Hashing Algorithm

- **Algorithm**: bcryptjs
- **Salt Rounds**: 10 (balanced security and performance)
- **Storage**: Only hashed passwords stored in database (never plaintext)

### Password Policy

- **Minimum Length**: 8 characters (enforced by Zod validation)
- **Validation**: Client-side and server-side validation
- **Future Enhancement**: Password strength requirements (complexity, common password checks)

---

## Session Management

### JWT Strategy

- **Type**: Stateless JWT tokens
- **Signing**: Tokens signed with `NEXTAUTH_SECRET`
- **Storage**: Client-side (httpOnly cookies managed by NextAuth)
- **Expiration**: Managed by NextAuth.js (configurable)

### Session Security

- **Secret Strength**: `NEXTAUTH_SECRET` must be at least 32 characters in production
- **HTTPS Required**: Production deployments must use HTTPS
- **Custom Fields**: User ID and role stored in JWT token

---

## Email Verification Flow

### Token Generation

- **Algorithm**: `crypto.randomBytes(32)` - 256-bit cryptographically secure random tokens
- **Encoding**: base64url (URL-safe)
- **Storage**: Tokens stored in database with expiration timestamp

### Token Security

- **TTL**: Configurable expiration (default: 30 minutes)
- **Cooldown**: Prevents abuse with resend cooldown (default: 2 minutes)
- **One-Time Use**: Tokens are deleted after successful verification
- **Atomic Operations**: Verification and cleanup in single database transaction

---

## Input Validation

### Validation Strategy

- **Client-Side**: Zod schemas validate input before submission
- **Server-Side**: All server actions validate input with Zod
- **Type Safety**: TypeScript + Zod ensures type-safe validation

### Validated Inputs

- **Email**: Valid email format, normalized (lowercase, trimmed)
- **Password**: Minimum length, format validation
- **Form Data**: All form fields validated before processing

---

## OAuth Security

### Account Linking

**Configuration**: `allowDangerousEmailAccountLinking: true`

**Rationale**:
- OAuth providers (Google, GitHub) verify email ownership before issuing tokens
- Email addresses from OAuth providers are trusted
- Seamless user experience - no manual account linking step
- Same email = same user account (automatic linking)

**Security Considerations**:
- Only enabled for trusted OAuth providers
- Email must be verified by OAuth provider
- No account takeover risk (email is verified by provider)
- Credentials still require email verification

### OAuth Best Practices

- **Separate Apps**: Use different OAuth apps for development and production
- **Callback URLs**: Validate callback URLs in OAuth app settings
- **Secret Rotation**: Rotate OAuth secrets regularly
- **HTTPS**: Always use HTTPS in production

---

## Database Security

### Connection Security

- **SSL Required**: Database connections use SSL (`sslmode=require`)
- **Connection String**: Stored in environment variables (never committed)
- **Prisma ORM**: Parameterized queries prevent SQL injection

### Data Protection

- **Password Hashing**: Passwords never stored in plaintext
- **Email Normalization**: Emails normalized to prevent duplicate accounts
- **Transaction Safety**: Critical operations use database transactions

---

## API Security

### Rate Limiting

- **Email Resend**: Cooldown protection prevents abuse
- **Future Enhancement**: Global rate limiting for API endpoints

### Error Handling

- **Generic Messages**: Error messages don't reveal if email exists
- **No Information Disclosure**: Sensitive errors logged server-side only
- **Consistent Format**: Unified error response format

---

## Environment Variables

### Secret Management

- **Never Committed**: `.env` and `.env.local` in `.gitignore`
- **Example File**: `.env.example` documents all variables (no secrets)
- **Validation**: Environment variables validated with Zod on startup

### Required Secrets

- `NEXTAUTH_SECRET`: Strong random string (32+ characters)
- `DATABASE_URL`: PostgreSQL connection string with credentials
- OAuth provider secrets (if using OAuth)

---

## Security Checklist

### Production Deployment

- [ ] `NEXTAUTH_SECRET` is strong random string (32+ chars)
- [ ] All environment variables configured
- [ ] HTTPS enabled
- [ ] Database uses SSL connections
- [ ] OAuth callback URLs configured correctly
- [ ] Debug endpoints disabled (or protected)
- [ ] Email provider configured and verified
- [ ] DNS records configured (SPF, DKIM for email)

### Development

- [ ] `.env.local` not committed to Git
- [ ] Strong `NEXTAUTH_SECRET` even in development
- [ ] Test OAuth apps use separate credentials
- [ ] Database backups configured

---

## Threat Mitigation

### Common Vulnerabilities

| Threat | Mitigation |
|--------|-----------|
| SQL Injection | Prisma ORM (parameterized queries) |
| XSS | React automatic escaping, no `dangerouslySetInnerHTML` |
| CSRF | NextAuth.js built-in protection |
| Session Hijacking | JWT with strong secret, HTTPS required |
| Brute Force | Email verification, future rate limiting |
| Account Enumeration | Generic error messages |
| Password Attacks | bcrypt hashing, minimum length requirements |

---

## Compliance Considerations

### Data Protection

- **Password Storage**: Industry-standard hashing (bcrypt)
- **Email Verification**: Confirms email ownership
- **Session Security**: Secure token management

### Audit Logging

- **Future Enhancement**: Comprehensive audit logging
- **Current**: Basic error logging for debugging

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use strong secrets** (32+ characters, random)
3. **Enable HTTPS** in production
4. **Keep dependencies updated** (regular security audits)
5. **Monitor for suspicious activity** (future enhancement)
6. **Regular security reviews** of authentication flows

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Contact the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

---

**Last Updated**: January 27, 2025

