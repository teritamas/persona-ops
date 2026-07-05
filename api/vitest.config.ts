import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['dist/**', 'scripts/**', 'src/server.ts'],
      include: [
        'src/agents/simulation-agent/**/*.ts',
        'src/application/**/*.ts',
        'src/domain/**/*.ts',
        'src/infra/ai/**/*.ts',
        'src/infra/document/**/*.ts',
        'src/infra/queue/**/*.ts',
        'src/routes/**/*.ts',
      ],
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
