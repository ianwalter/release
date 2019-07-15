const { Print } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')
const commits = require('@ianwalter/commits')
const marked = require('marked')
const TerminalRenderer = require('marked-terminal')
const prompts = require('prompts')

marked.setOptions({ renderer: new TerminalRenderer() })

const stdio = { stdio: 'inherit' }

const precheck = async (config) => {
  const print = new Print({ logLevel: config.logLevel || 'info' })

  // Checkout master.
  await execa('git', ['checkout', 'master'])

  // Check if there are uncommited changes in the current working directory.
  const { stdout: status } = await execa('git', ['status', '-s'])
  print.debug(status)
  if (status !== '') {
    throw new Error('Uncommited changes!')
  }

  // Check if the upstream branch has commits that the local one doesn't.
  const { stdout: upstreamStatus } = await execa('git', ['rev-list', '..@{u}'])
  print.debug(upstreamStatus)
  if (upstreamStatus !== '') {
    throw new Error('Upstream has changes!')
  }
}

const release = async ({ $package, ...config }) => {
  const print = new Print({ logLevel: config.logLevel || 'info' })

  // Create the tag string from the configured version.
  const oldTag = `v${$package.version}`
  const newTag = `v${config.version}`

  // Check if there is already a local tag for the new version.
  const { stdout: localTag } = await execa('git', ['tags', newTag])
  if (localTag !== '') {
    throw new Error(`Local tag for ${newTag} already exists!`)
  }

  // Check if there is already a remote tag for the new version.
  const ref = `refs/tags/${newTag}`
  const { stdout: remoteTag } = await execa('git', ['ls-remote', 'origin', ref])
  if (remoteTag !== '') {
    throw new Error(`Remote tag for ${newTag} already exists!`)
  }

  if (!config.yolo) {
    // Re-install node modules using yarn.
    process.stdout.write('\n')
    await execa('yarn', ['--force'], stdio)

    // Run the lint script if it's defined in the project's package.json.
    if ($package.scripts.lint) {
      process.stdout.write('\n')
      await execa('yarn', ['lint'], stdio)
    }

    // Run the test script if it's defined in the project's package.json.
    if ($package.scripts.test) {
      process.stdout.write('\n')
      await execa('yarn', ['test'], stdio)
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
    process.stdout.write('\n')
    await execa('git', ['checkout', '-b', config.branch], stdio)
  }

  // Get the markdown summary of the commits since the last release before the
  // version commit is created.
  const { markdown } = await commits(oldTag)

  // Update the package.json version.
  const versionArgs = ['version', '--new-version', config.version]
  const { stdout: versionOutput } = await execa('yarn', versionArgs)
  print.debug(versionOutput)

  // Push the version commit and tag upstream.
  const { stdout: pushOutput } = await execa('git', ['push', '-u'])
  print.debug(pushOutput)
  const { stdout: pushTag } = await execa('git', ['push', 'origin', newTag])
  print.debug(pushTag)

  // Determine the repository URL.
  const { stdout: remote } = await execa('git', ['config', 'remote.origin.url'])
  print.debug('Remote:', remote)
  const [repo] = remote.split(':')[1].split('.git')
  const repoUrl = `https://github.com/${repo}`
  print.debug('Repo URL:', repoUrl)

  // If --branch was specified, prompt for confirmation before tagging and
  // publishing the package.
  if (config.branch) {
    // Display the link to create a pull request for the release branch.
    const prUrl = `${repoUrl}/compare/master...${config.branch}`
    const prLink = `[Create a pull request for this release!](${prUrl})`
    print.log('🔗', marked(prLink).trimEnd() + '\n')

    if (!config.yolo) {
      await prompts(
        {
          type: 'confirm',
          message: 'Proceed with publishing?',
          initial: true
        },
        { onCancel: () => process.exit(1) } // TODO: add rollback functionality.
      )
    }
  }

  // Publish the package.
  process.stdout.write('\n')
  let publishArgs = ['publish', '--new-version', config.version]
  if (config.access) {
    publishArgs = publishArgs.concat(['--access', config.access])
  }
  await execa('yarn', publishArgs, stdio)

  // Create the release on GitHub.
  const releaseUrl = newGithubReleaseUrl({
    repoUrl,
    tag: newTag,
    body: markdown,
    isPrerelease: config.isPrerelease
  })
  print.debug('Release URL:', releaseUrl)

  // Print a success message letting the user know their package version has
  // be published.
  process.stdout.write('\n')
  print.success(`Published ${$package.name} ${newTag}!`)

  // Display the link to create a GitHub release.
  const releaseLink = `[Create a GitHub release for this tag!](${releaseUrl})`
  print.log('🔗', marked(releaseLink).trimEnd() + '\n')
}

module.exports = { precheck, release }
