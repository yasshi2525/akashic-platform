import { createDefaultPreset } from "ts-jest";

/** @type {import("jest").Config} */
export default {
    collectCoverage: true,
    coverageDirectory: "coverage",
    collectCoverageFrom: ["src/**"],
    rootDir: "./",
    testMatch: ["<rootDir>/spec/**/*.spec.ts"],
    ...createDefaultPreset({
        tsconfig: "<rootDir>/spec/tsconfig.json",
    }),
};
