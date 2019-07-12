const { print } = require('@ianwalter/print')
const execa = require('execa')

module.exports = async ({ $package, ...config }) => {
  // Run the test script if it is defined in the project's package.json.
  if ($package.scripts.test) {
    await execa('yarn', ['test'])
  }
}
