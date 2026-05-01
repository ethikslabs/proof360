import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    include: [
      'tests/unit/**/*.test.js',
      'tests/exploration/**/*.test.js',
      'tests/preservation/**/*.test.js',
    ],
  },
});
