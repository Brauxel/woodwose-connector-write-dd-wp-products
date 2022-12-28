import type { Config } from 'jest'

const config: Config = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|js)'],
  testEnvironment: 'node',
  setupFiles: ['./jest/jest.setup.ts', './jest/env.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
}

export default config
