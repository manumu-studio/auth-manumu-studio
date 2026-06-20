import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Restrict fake timers to only what tests need (Date + scheduling APIs).
    // Vitest v4 fakes queueMicrotask/process.nextTick/performance/setImmediate
    // by default, which breaks Vitest's own hook-timeout machinery and causes
    // instant "Hook timed out" failures in afterEach. Excluding those APIs
    // keeps Vitest's internals on real timers while tests still get a faked Date
    // and scheduling primitives for deterministic JWT/expiry assertions.
    fakeTimers: {
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
