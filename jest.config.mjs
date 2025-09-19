import { pathsToModuleNameMapper } from 'ts-jest'
import { readFileSync } from 'fs'

// Grab baseUrl + paths from your tsconfig:
const { compilerOptions } = JSON.parse(
  readFileSync('./tsconfig.json', 'utf8')
)

/** @type {import('jest').Config} */
export default {
  maxWorkers: '100%',
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx)'],
  transform: {
    '^.+\\.[tj]sx?$': ['esbuild-jest', {format: 'cjs'}],
  },
  // Allow transforming specific ESM modules inside node_modules (e.g. nanoid)
  transformIgnorePatterns: ['/node_modules/(?!nanoid)'],

  // Where Jest should look for bare‐imported modules:
  moduleDirectories: ['node_modules', compilerOptions.baseUrl],

  // Turn TS paths into Jest mapper entries:
  moduleNameMapper: {
    // strip js so that jest can find the TS files
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // // Handle TypeScript path aliases
    ...pathsToModuleNameMapper(
      compilerOptions.paths,
      { prefix: `<rootDir>/${compilerOptions.baseUrl}/`, useESM: true }
    ),
  },

  moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
}
