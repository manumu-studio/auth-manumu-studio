# Auth Route Group

Public authentication-support pages:

- `/verify`
- `/verify/error`
- `/verify/success`
- `/forgot-password`
- `/reset-password`
- `/reset-password/error`
- `/reset-password/success`
- `/onboarding`

These pages do not define the NextAuth handler; that lives under
`src/app/api/auth/[...nextauth]/`.
