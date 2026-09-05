/** @type {import('jest').Config} */
module.exports = {
  rootDir: "src",
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        swcrc: false,
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2022",
        },
      },
    ],
  },
  testRegex: ".*\\.spec\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
};
