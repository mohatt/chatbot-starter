import { defineConfig, defaultExclude } from 'vitest/config'

export default defineConfig({
  test: {
    unstubEnvs: true,
    unstubGlobals: true,
    expandSnapshotDiff: true,
    include: ['tests/**/*.test.ts'],
    exclude: [...defaultExclude, 'tests/util/**', 'dist/**', '**/__fixtures__'],
    globalSetup: ['./tests/util/setup.ts'],
    setupFiles: ['./tests/util/setup-test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    },
    chaiConfig: {
      truncateThreshold: 500,
    },
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
})
