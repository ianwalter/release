const stdio = { stdio: 'inherit' }
const execa = require('execa')

// Re-install node modules using yarn.
async function install () {
  process.stdout.write('\n')
  await execa('yarn', ['--force'], stdio)
}

// Run the lint script if it's defined in the project's package.json.
async function lint ({ lint, packageJson }) {
  lint = lint || (packageJson.scripts && packageJson.scripts.lint && 'lint')
  if (lint) {
    process.stdout.write('\n')
    await execa('yarn', [lint], stdio)
  }
}

// Run the test script if it's defined in the project's package.json.
async function test ({ test, packageJson }) {
  test = test || (packageJson.scripts && packageJson.scripts.test && 'test')
  if (test) {
    process.stdout.write('\n')
    await execa('yarn', [test], stdio)
  }
}

module.exports = { install, lint, test }
