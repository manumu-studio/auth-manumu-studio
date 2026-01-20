# PR-0.8.0 — Security Headers (CSP + HSTS)

**Date:** January 20, 2026  
**Branch:** `feature/security-headers`  
**Type:** Security Hardening

---

## Summary

Adds baseline HTTP security headers at the middleware layer for auth and public routes.

---

## Changes

- CSP, HSTS (prod only), X-Frame-Options, Referrer-Policy, X-Content-Type-Options
- Updated security and architecture documentation

---

## Testing

- Lint: **✔**
- Manual: pending (validate OAuth flows against CSP)

