/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'jsdom',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    // Override problematic tsconfig options for tests
                    module: 'ESNext',
                    moduleResolution: 'bundler',
                    allowImportingTsExtensions: false,
                    noEmit: false,
                    noUnusedLocals: false,
                    noUnusedParameters: false,
                },
            },
        ],
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
};
