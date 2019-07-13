const { promises: fs } = require('fs')
const { print } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')

module.exports = async ({ $package, ...config }) => {
  // Run the test script if it is defined in the project's package.json.
  if ($package.scripts.test) {
    await execa('yarn', ['test'])
  }

  // Checkout master.
  await execa('git', ['checkout', 'master'])

  // Pull the latest from upstream.
  await execa('git', ['pull'])

  // Checkout a release branch.
  const tag = `v${config.version}`
  await execa('git', ['checkout', '-b', `release-${tag}`])

  // Update the package.json version.
  $package.version = config.version
  await fs.writeFile(path.resolve('package.json', ))

  // Commit the version update.
  await execa('git', ['commit', '-m', tag])

  // Push the release branch upstream.
  await execa('git', ['push', '-u'])

  // Publish the package.
  await execa('yarn', 'publish')

  // Create the release on GitHub.
  const githubUrl = newGithubReleaseUrl({
    tag,
    isPrerelease: config.isPrerelease
  })

  print.success('', githubUrl)
}
