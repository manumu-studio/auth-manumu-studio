# Architecture Documentation

**ManuMu Studio Authentication** - System Architecture and Design

---

## Overview

This document describes the high-level architecture, data flows, and design decisions for ManuMu Studio Authentication.

---

## System Architecture

### High-Level Components

```mermaid
graph TB
    A[Next.js App Router] --> B[NextAuth.js]
    B --> C[Prisma ORM]
    C --> D[PostgreSQL Database]
    B --> E[OAuth Providers]
    B --> F[Email Provider]
    
    A --> G[Server Components]
    A --> H[Client Components]
    G --> I[Server Actions]
    I --> C
    
    F --> J[Resend API]
    E --> K[Google OAuth]
    E --> L[GitHub OAuth]
```

### Technology Stack

- **Frontend**: Next.js 15 App Router, React 18, Tailwind CSS + Framer Motion
- **Authentication**: NextAuth.js v4 (Auth.js)
- **Database**: Prisma ORM + PostgreSQL (Neon Serverless)
- **Email**: Resend API (with SMTP fallback)
- **Validation**: Zod schemas
- **Language**: TypeScript (strict mode)

---

## Authentication Flow

### Email/Password Sign-Up Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Server
    participant DB
    participant Email

    User->>UI: Fill sign-up form
    UI->>Server: registerUser(formData)
    Server->>Server: Validate with Zod
    Server->>DB: Check duplicate email
    Server->>Server: Hash password (bcrypt)
    Server->>DB: Create user (unverified)
    Server->>Server: Generate verification token
    Server->>DB: Store token
    Server->>Email: Send verification email
    Email->>User: Verification link
    User->>UI: Click verification link
    UI->>Server: consumeVerificationToken(token)
    Server->>DB: Validate token
    Server->>DB: Mark email verified
    Server->>DB: Delete token
    Server->>UI: Success
    UI->>User: Can now sign in
```

### Email/Password Sign-In Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant NextAuth
    participant DB

    User->>UI: Enter email/password
    UI->>NextAuth: signIn('credentials')
    NextAuth->>NextAuth: Validate input (Zod)
    NextAuth->>DB: Fetch user by email
    NextAuth->>NextAuth: Compare password (bcrypt)
    NextAuth->>NextAuth: Check emailVerified
    alt Email not verified
        NextAuth->>UI: Error: EMAIL_NOT_VERIFIED
    else Email verified
        NextAuth->>NextAuth: Create JWT token
        NextAuth->>NextAuth: Add custom fields (id, role)
        NextAuth->>UI: Session established
        UI->>User: Authenticated
    end
```

### OAuth Sign-In Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant NextAuth
    participant OAuthProvider
    participant DB

    User->>UI: Click "Log In With GitHub/Google"
    UI->>NextAuth: signIn('github'|'google')
    NextAuth->>OAuthProvider: Redirect to OAuth
    OAuthProvider->>User: Authorization prompt
    User->>OAuthProvider: Grant permission
    OAuthProvider->>NextAuth: Callback with code
    NextAuth->>OAuthProvider: Exchange code for token
    OAuthProvider->>NextAuth: User profile + email
    NextAuth->>DB: Check existing user by email
    alt User exists
        NextAuth->>DB: Link OAuth account
    else New user
        NextAuth->>DB: Create user + account
    end
    NextAuth->>NextAuth: Create JWT token
    NextAuth->>UI: Session established
    UI->>User: Authenticated
```

### OAuth Authorization Code Flow (Third-Party Apps)

```mermaid
sequenceDiagram
    participant User
    participant App
    participant AuthServer
    participant DB

    App->>AuthServer: GET /oauth/authorize?client_id&redirect_uri&scope&state
    AuthServer->>AuthServer: Validate client + redirect + scope + PKCE
    AuthServer->>User: Consent screen
    User->>AuthServer: Approve
    AuthServer->>DB: Store auth code + PKCE challenge (TTL)
    AuthServer->>App: Redirect with code + state
```

### OAuth Token Exchange Flow (Third-Party Apps)

```mermaid
sequenceDiagram
    participant App
    participant AuthServer
    participant DB

    App->>AuthServer: POST /oauth/token (code + client auth + PKCE)
    AuthServer->>DB: Load auth code + validate (TTL/used)
    AuthServer->>AuthServer: Verify client secret or PKCE verifier
    AuthServer->>DB: Mark auth code used
    AuthServer->>App: JWT access token (iss/aud/sub/scope/exp)
```

---

## Data Flow

### Session Management

```mermaid
graph LR
    A[User Sign-In] --> B[NextAuth authorize]
    B --> C[Create JWT Token]
    C --> D[Store in HTTP-only Cookie]
    D --> E[Client Request]
    E --> F[Server Component]
    F --> G[getServerSession]
    G --> H[Verify JWT]
    H --> I[Hydrate Session]
    I --> J[Render with Session]
```

### Email Verification Flow

```mermaid
stateDiagram-v2
    [*] --> Unverified: User Signs Up
    Unverified --> TokenCreated: Generate Token
    TokenCreated --> EmailSent: Send Email
    EmailSent --> TokenExpired: TTL Exceeded
    EmailSent --> TokenConsumed: User Clicks Link
    TokenConsumed --> Verified: Update User
    TokenExpired --> [*]: Token Deleted
    Verified --> [*]: Can Sign In
```

---

## Project Structure

### Feature-Based Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Protected routes
│   └── api/               # API routes
│
├── features/
│   └── auth/              # Authentication feature
│       ├── components/    # UI components
│       ├── server/        # Server logic
│       ├── lib/           # Utilities
│       └── types/         # TypeScript types
│
└── lib/                   # Shared utilities
    ├── validation/        # Zod schemas
    ├── prisma.ts          # Database client
    └── env.ts             # Environment validation
```

### Component Hierarchy

```mermaid
graph TD
    A[Root Layout] --> B[Providers]
    B --> C[SessionProvider]
    C --> E[App Pages]
    E --> F[Public Page]
    E --> G[Auth Pages]
    F --> H[AuthShell]
    H --> I[EmailStep]
    H --> J[PasswordStep]
    H --> K[SignupStep]
    H --> L[GoogleButton]
    H --> M[GitHubButton]
    H --> N[UserCard]
    H --> O[Sign Out Button]
```

---

## Database Schema

### Core Models

```mermaid
erDiagram
    User ||--o{ Account : has
    User ||--o| UserProfile : has
    User ||--o{ Session : has
    User ||--o{ VerificationToken : "receives"

    User {
        string id PK
        string email UK
        string password
        string name
        datetime emailVerified
        enum role
        datetime createdAt
        datetime updatedAt
    }

    Account {
        string id PK
        string userId FK
        string provider
        string providerAccountId
        string access_token
        string refresh_token
        int expires_at
    }

    Session {
        string id PK
        string sessionToken UK
        string userId FK
        datetime expires
    }

    VerificationToken {
        string identifier
        string token UK
        datetime expires
    }

    UserProfile {
        string id PK
        string userId FK
        string country
        string city
        string address
    }
```

---

## Design Decisions

### Why JWT Strategy?

**Decision**: Use JWT sessions instead of database sessions

**Rationale**:
- Works with both Credentials and OAuth providers
- Stateless - no database queries for session validation
- Better performance for serverless deployments
- Scales horizontally without session storage

**Trade-offs**:
- Token size limits (mitigated by storing minimal data)
- Cannot revoke sessions server-side (future: token blacklist)

### Why Feature-Based Architecture?

**Decision**: Organize code by feature rather than by type

**Rationale**:
- Related code lives together
- Easier to understand and maintain
- Clear boundaries between features
- Scalable for team collaboration

### Why Email Verification for Credentials?

**Decision**: Require email verification before credentials sign-in

**Rationale**:
- Prevents fake/bot accounts
- Confirms email ownership
- Improves data quality
- Foundation for password reset

**Trade-off**:
- Additional step for users (mitigated by clear UX)

### Why Account Linking?

**Decision**: Enable automatic account linking by email

**Rationale**:
- Better user experience (no manual linking)
- OAuth providers verify email ownership
- Same email = same user (intuitive)

**Security**:
- Only for trusted OAuth providers
- Email verified by provider
- No account takeover risk

### Theme System Implementation

**Decision**: Hybrid Tailwind CSS + SCSS Module overrides for dark theme

**Rationale**:
- Tailwind `dark:` classes work with class-based dark mode
- SCSS `@media (prefers-color-scheme: dark)` works with system preferences
- Hybrid approach ensures consistent theming across components
- Components use SCSS overrides for precise dark theme matching (e.g., `#2d2d2d` background, `#404040` borders)

**Implementation**:
- **Tailwind**: Used for utility classes and component styling
- **SCSS Modules**: Used for dark theme overrides in `*.module.scss` files
- **Media Queries**: `@media (prefers-color-scheme: dark)` for system preference support
- **Components**: AuthShell, UserCard, NextButton use SCSS overrides for theme parity

### UX Enhancements

**Autofocus Behavior**:
- PasswordStep: Auto-focuses password input after step transition (350ms delay)
- SignupStep: Auto-focuses first input (firstname) after step transition (350ms delay)
- Improves keyboard navigation and reduces clicks/taps
- Delay ensures animations complete before focus

**Component Separation**:
- UserCard is presentational (displays user information only)
- Sign Out button rendered at page level (`app/(public)/page.tsx`)
- Clear separation of concerns: UserCard can be reused without Sign Out dependency

---

## API Architecture

### NextAuth.js Integration

```mermaid
graph LR
    A[Client] --> B[/api/auth/[...nextauth]]
    B --> C[NextAuth Handler]
    C --> D[Auth Options]
    D --> E[Providers]
    D --> F[Callbacks]
    D --> G[Adapter]
    G --> H[Prisma]
    H --> I[PostgreSQL]
```

### Server Actions

```mermaid
graph TD
    A[Client Form] --> B[Server Action]
    B --> C[Zod Validation]
    C --> D{Valid?}
    D -->|No| E[Return Errors]
    D -->|Yes| F[Business Logic]
    F --> G[Database Operation]
    G --> H[Return Result]
```

---

## Security Architecture

### Authentication Layers

1. **Input Validation**: Zod schemas on client and server
2. **Password Security**: bcrypt hashing (10 salt rounds)
3. **Session Security**: JWT signed with strong secret
4. **Email Verification**: Token-based with TTL
5. **OAuth Security**: Provider-verified email addresses
6. **Rate Limiting**: IP + email limits on sensitive auth endpoints
7. **Security Headers**: CSP, HSTS, X-Frame-Options, Referrer-Policy

### Security Flow

```mermaid
graph TB
    A[User Input] --> B[Client Validation]
    B --> C[Server Validation]
    C --> D[Business Logic]
    D --> E[Database]
    E --> F[Response]
    
    B --> G[Zod Schema]
    C --> G
    D --> H[bcrypt Hash]
    D --> I[Token Generation]
    I --> J[crypto.randomBytes]
```

---

## Deployment Architecture

### Production Infrastructure

```mermaid
graph TB
    A[User] --> B[Vercel Edge]
    B --> C[Next.js App]
    C --> D[Serverless Functions]
    D --> E[Neon Serverless]
    D --> F[Resend API]
    D --> G[OAuth Providers]
    
    H[GoDaddy DNS] --> B
```

### Environment Configuration

- **Vercel**: Application hosting and serverless functions
- **Neon Serverless**: PostgreSQL database with automatic scaling
- **Resend**: Email delivery service
- **GoDaddy**: Custom domain management

---

## Future Enhancements

### Planned Architecture Improvements

- **Caching**: Redis cache for session validation
- **Monitoring**: Application performance monitoring
- **Analytics**: User authentication analytics
- **Testing**: Comprehensive test suite (unit, integration, E2E)

---

**Last Updated**: January 27, 2025

