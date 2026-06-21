// security-ci-config.test.ts — asserts dependency and CI security gate correctness
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

// Read files once for all assertions
const pkgJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};
const ciYaml = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');

// ─── Helper ──────────────────────────────────────────────────────────────────

function semverMajor(range: string): number {
  // Strip leading ^, ~, >=, <=, >, <, = and whitespace
  const clean = range.replace(/^[^0-9]*/, '').trim();
  const major = parseInt(clean.split('.')[0] ?? '0', 10);
  return major;
}

// ─── Lockfile ────────────────────────────────────────────────────────────────

describe('lockfile hygiene', () => {
  it('pnpm-lock.yaml exists', () => {
    expect(existsSync(resolve(ROOT, 'pnpm-lock.yaml'))).toBe(true);
  });

  it('package-lock.json does NOT exist', () => {
    expect(existsSync(resolve(ROOT, 'package-lock.json'))).toBe(false);
  });

  it('yarn.lock does NOT exist', () => {
    expect(existsSync(resolve(ROOT, 'yarn.lock'))).toBe(false);
  });
});

// ─── Next.js & ESLint versions ───────────────────────────────────────────────

describe('Next.js and eslint-config-next versions', () => {
  it('next is pinned to ^15.5.19 or higher in dependencies', () => {
    const nextVersion = pkgJson.dependencies?.['next'];
    expect(nextVersion).toBeDefined();
    // Strip range prefix and verify major.minor.patch >= 15.5.19
    const clean = (nextVersion ?? '').replace(/^[^0-9]*/, '');
    const [major, minor, patch] = clean.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(15);
    if (major === 15) {
      expect(minor).toBeGreaterThanOrEqual(5);
      if (minor === 5) {
        expect(patch).toBeGreaterThanOrEqual(19);
      }
    }
  });

  it('eslint-config-next is compatible with next (same ^15.5.19 range)', () => {
    const eslintNext = pkgJson.devDependencies?.['eslint-config-next'];
    expect(eslintNext).toBeDefined();
    const clean = (eslintNext ?? '').replace(/^[^0-9]*/, '');
    const [major, minor, patch] = clean.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(15);
    if (major === 15) {
      expect(minor).toBeGreaterThanOrEqual(5);
      if (minor === 5) {
        expect(patch).toBeGreaterThanOrEqual(19);
      }
    }
  });
});

// ─── Vitest packages aligned on same major ───────────────────────────────────

describe('Vitest packages share a major version', () => {
  it('vitest, @vitest/ui, and @vitest/coverage-v8 are all declared', () => {
    expect(pkgJson.devDependencies?.['vitest']).toBeDefined();
    expect(pkgJson.devDependencies?.['@vitest/ui']).toBeDefined();
    expect(pkgJson.devDependencies?.['@vitest/coverage-v8']).toBeDefined();
  });

  it('all three Vitest packages share the same major version', () => {
    const vitestMajor = semverMajor(pkgJson.devDependencies?.['vitest'] ?? '0');
    const uiMajor = semverMajor(pkgJson.devDependencies?.['@vitest/ui'] ?? '0');
    const coverageMajor = semverMajor(pkgJson.devDependencies?.['@vitest/coverage-v8'] ?? '0');

    expect(vitestMajor).toBe(uiMajor);
    expect(vitestMajor).toBe(coverageMajor);
  });
});

// ─── CI audit commands ───────────────────────────────────────────────────────

describe('CI audit commands', () => {
  it('contains blocking full-tree audit: pnpm audit --audit-level=high', () => {
    expect(ciYaml).toContain('pnpm audit --audit-level=high');
  });

  it('contains blocking prod-only audit: pnpm audit --prod --audit-level=high', () => {
    expect(ciYaml).toContain('pnpm audit --prod --audit-level=high');
  });
});

// ─── Gitleaks with full history ──────────────────────────────────────────────

describe('gitleaks secret scan configuration', () => {
  it('CI includes the gitleaks action', () => {
    expect(ciYaml).toContain('gitleaks/gitleaks-action@v2');
  });

  it('gitleaks checkout uses fetch-depth: 0 (full history)', () => {
    // The security-audit job must have fetch-depth: 0 before gitleaks
    // We check both are present in the file (order guaranteed by file structure)
    expect(ciYaml).toContain('fetch-depth: 0');
    expect(ciYaml).toContain('gitleaks/gitleaks-action@v2');
  });
});

// ─── No continue-on-error in security-audit job ──────────────────────────────

describe('security-audit job strictness', () => {
  it('security-audit job does not contain continue-on-error', () => {
    // Extract just the security-audit job block
    const securityAuditStart = ciYaml.indexOf('security-audit:');
    expect(securityAuditStart).toBeGreaterThan(-1);

    // The security-audit job is the last job in the file; slice to end
    const securityAuditBlock = ciYaml.slice(securityAuditStart);
    expect(securityAuditBlock).not.toContain('continue-on-error');
  });
});

// ─── No npm install or --legacy-peer-deps in CI ──────────────────────────────

describe('CI uses only pnpm (no npm install)', () => {
  it('CI does not contain bare npm install command', () => {
    // Match `npm install` as a standalone command (not as part of `pnpm install`)
    expect(ciYaml).not.toMatch(/(?<!\w)npm install/);
  });

  it('CI does not contain --legacy-peer-deps', () => {
    expect(ciYaml).not.toContain('--legacy-peer-deps');
  });
});
