# (public) Route Group
Public entry points of the application.

- Renders the landing or auth modal depending on session state.
- Accessible without authentication.
- Uses SSR session check from `layout.tsx` → `Providers` → `SessionProvider`.