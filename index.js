const { print } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')
const commits = require('@ianwalter/commits')
const marked = require('marked')
const TerminalRenderer = require('marked-terminal')

marked.setOptions({ renderer: new TerminalRenderer() })

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
  const { stdout: localTag } = await execa('git', ['tags', newTag])
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
  }

  // If --branch was specified, create a release branch instead of publishing
  // from the master branch.
  if (config.branch) {
    // Determine if a branch name was specified for the release branch or
    // generate one.
    config.branch = typeof config.branch === 'string'
      ? config.branch
      : `release-${newTag}`

    // Checkout the release branch.
    await execa('git', ['checkout', '-b', branch])
  }

  // Get the markdown summary of the commits since the last release before the
  // version commit is created.
  const { markdown } = await commits(oldTag)

  // Update the package.json version.
  await execa('yarn', ['version', '--new-version', config.version])

  // Push the version commit and tag upstream.
  await execa('git', ['push', '-u'])
  await execa('git', ['push', 'origin', newTag])

  // Determine the repository URL.
  const { stdout: remote } = await execa('git', ['config', 'remote.origin.url'])
  const [repo] = remote.split(':')[1].split('.git')
  const repoUrl = `https://github.com/${repo}`

  // If --branch was specified, prompt for confirmation before tagging and
  // publishing the package.
  if (config.branch) {
    // Display the link to create a pull request for the release branch.
    const prUrl = `${repoUrl}/compare/master..${config.branch}`
    const prLink = `[Create a pull request for this release!](${prUrl})`
    print.log('🔗', marked(prLink).trimEnd() + '\n')

    if (!config.yolo) {

    }
  }

  // Publish the package.
  const access = config.access || 'public'
  await execa(
    'yarn',
    ['publish', '--new-version', config.version, '--access', access],
    { stdio: 'inherit' }
  )

  // Create the release on GitHub.
  const releaseUrl = newGithubReleaseUrl({
    repoUrl,
    tag: newTag,
    body: markdown,
    isPrerelease: config.isPrerelease,
  })

  //
  process.stdout.write('\n')
  print.success(`Published ${$package.name} ${newTag}!`)

  // Display the link to create a GitHub release.
  const releaseLink = `[Create a GitHub release for this tag!](${releaseUrl})`
  print.log('🔗', marked(releaseLink).trimEnd() + '\n')
}

module.exports = { precheck, release }
