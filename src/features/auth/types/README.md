# Auth Types
Reserved for extending NextAuth types.

Example (to be implemented):
```ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
  }
}