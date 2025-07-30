/** @type {import('jest').Config} */
export default {
  maxWorkers: '100%',
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx)'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
  // Using esbuild-jest for faster tests
  transform: {
    '^.+\\.[jt]sx?$': 'esbuild-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}
