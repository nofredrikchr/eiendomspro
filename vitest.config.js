import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Auth-kjernen kjører server-side (Node), ikke i nettleser.
    environment: 'node',
    include: ['api/**/*.test.js', 'src/**/*.test.js'],
  },
});
