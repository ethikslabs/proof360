import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['tests/memory/global-setup.js'],
    include: [
      'tests/unit/**/*.test.js',
      'tests/exploration/**/*.test.js',
      'tests/preservation/**/*.test.js',
      'tests/property/**/*.test.js',
      'tests/memory/**/*.test.js',
    ],
  },
});
