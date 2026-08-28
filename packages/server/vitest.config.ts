import { defineConfig } from 'vitest/config';

export default defineConfig({
  // NODE_ENV=test matches the guards used throughout the codebase (rate
  // limiters, httpLogger, metricsCollector all check NODE_ENV !== 'test').
  // Without it, a full integration run trips the API/auth rate limiters.
  test: {
    env: { NODE_ENV: 'test' },
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
