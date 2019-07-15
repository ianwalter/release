const { promises: fs } = require('fs')
const { print } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')

const precheck = async () => {
  // Checkout master.
  await execa('git', ['checkout', 'master'])

  // Check if there are uncommited changes in the current working directory.
  const { stdout: status } = await execa('git', ['status', '-s'])
  if (status !== '') {
    throw new Error('Uncommited changes!')
  }

  // Check if local and remote are on the same commit.
  const { stdout: upstreamStatus } = await execa('git', ['rev-list', '..@{u}'])
  if (upstreamStatus !== '') {
    throw new Error('Upstream has changes!')
  }
}

const release = async ({ $package, ...config }) => {
  //
  await execa('rm', ['-rf', 'node_modules'])
  await execa('yarn')

  // Run the test script if it is defined in the project's package.json.
  if ($package.scripts.test) {
    await execa('yarn', ['test'])
  }

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

module.exports = { precheck, release }
