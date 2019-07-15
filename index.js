const { promises: fs } = require('fs')
const { print } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')
const commits = require('@ianwalter/commits')

const precheck = async () => {
  // Checkout master.
  await execa('git', ['checkout', 'master'])

  // Check if there are uncommited changes in the current working directory.
  const { stdout: status } = await execa('git', ['status', '-s'])
  if (status !== '') {
    throw new Error('Uncommited changes!')
  }

  // Check if the upstream branch has commits that the local one doesn't.
  const { stdout: upstreamStatus } = await execa('git', ['rev-list', '..@{u}'])
  if (upstreamStatus !== '') {
    throw new Error('Upstream has changes!')
  }
}

const release = async ({ $package, ...config }) => {
  // Create the tag string from the configured version.
  const oldTag = `v${$package.version}`
  const newTag = `v${config.version}`

  //
  const { stdout: localTag } = await execa('git', ['tag', '--list', newTag])
  if (localTag !== '') {
    throw new Error(`Local tag for ${newTag} already exists!`)
  }

  //
  const ref = `refs/tags/${newTag}`
  const { stdout: remoteTag } = await execa('git', ['ls-remote', 'origin', ref])
  if (remoteTag !== '') {
    throw new Error(`Remote tag for ${newTag} already exists!`)
  }

  if (!config.yolo) {
    // Re-install node modules using yarn.
    await execa('yarn', ['--force'])

    // Run the lint script if it's defined in the project's package.json.
    if ($package.scripts.lint) {
      await execa('yarn', ['lint'])
    }

    // Run the test script if it's defined in the project's package.json.
    if ($package.scripts.test) {
      await execa('yarn', ['test'])
    }

    // If --branch was specified, create a release branch instead of publishing
    // from the master branch.
    if (config.branch) {
      // Determine if a branch name was specified for the release branch or
      // generate one.
      const branch = typeof config.branch === 'string'
        ? config.branch
        : `release-${newTag}`

      // Checkout the release branch.
      await execa('git', ['checkout', '-b', branch])
    }
  }

  // Update the package.json version.
  $package.version = config.version
  await fs.writeFile(path.resolve('package.json'), JSON.stringify($package, 2))

  // Commit the version update.
  await execa('git', ['commit', '-m', newTag])

  // Push the commit upstream.
  await execa('git', ['push', '-u'])

  // If --branch was specified, prompt for confirmation before tagging and
  // publishing the package.
  if (config.branch && !config.yolo) {

  }

  // Create the release tag and push it upstream.
  await execa('git', ['tag', newTag])
  await execa('git', ['push', newTag])

  // Publish the package.
  await execa('yarn', ['publish'])
  print.success(`Published ${$package.name}@${$package.version}!`)

  // Get the markdown summary of the commits since the last release.
  const { markdown } = await commits(oldTag)

  // Determine the repository URL.
  const { stdout: remote } = await execa('git', ['config', 'remote.origin.url'])
  const [repo] = remote.split(':')[1].split('.git')
  const repoUrl = `https://github.com/${repo}`

  // Create the release on GitHub.
  const releaseUrl = newGithubReleaseUrl({
    repoUrl,
    tag: newTag,
    body: markdown,
    isPrerelease: config.isPrerelease,
  })

  // Display the link to create a GitHub release.
  const releaseLink = `[Create a GitHub release for this tag!](${releaseUrl})`
  print.log('🔗', marked(releaseLink).trimEnd() + '\n')
}

module.exports = { precheck, release }
