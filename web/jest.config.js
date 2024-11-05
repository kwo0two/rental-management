const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // next.config.js와 .env 파일이 있는 위치
  dir: './',
})

// Jest 설정
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig) 