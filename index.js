const { Print, md } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')
const commits = require('@ianwalter/commits')
const prompts = require('prompts')
const updatePackage = require('@ianwalter/update-package')

const stdio = { stdio: 'inherit' }
const gprUrl = 'https://npm.pkg.github.com/'

const precheck = async (config) => {
  const print = new Print({ level: config.logLevel || 'info' })

  // Checkout master.
  await execa('git', ['checkout', 'master'])

  // Check if there are uncommited changes in the current working directory.
  const { stdout: status } = await execa('git', ['status', '-s'])
  if (status !== '') {
    print.debug('Uncommited changes check:\n', status)
    throw new Error('Uncommited changes!')
  }

  // Check if there are unfetched changes in the remote repository.
  const remoteOptions = ['ls-remote', 'origin', 'HEAD']
  const { stdout: remoteHead } = await execa('git', remoteOptions)
  const [remoteRef] = remoteHead.split('\t')
  try {
    await execa('git', ['merge-base', '--is-ancestor', remoteRef, 'HEAD'])
  } catch (err) {
    print.debug('Unfetched changes check:', remoteRef)
    throw new Error('Unfetched changes!')
  }
}

const release = async ({ $package, ...config }) => {
  const print = new Print({ level: config.logLevel || 'info' })

  // Destructure and add defaults to config properties.
  const { registries = ['npm'] } = config

  // Check if there is already a local tag for the new version.
  const { stdout: localTag } = await execa('git', ['tag', '-l', config.version])
  if (localTag !== '') {
    throw new Error(`Local tag for ${config.version} already exists!`)
  }

  // Check if there is already a remote tag for the new version.
  const ref = `refs/tags/${config.version}`
  const { stdout: remoteTag } = await execa('git', ['ls-remote', 'origin', ref])
  if (remoteTag !== '') {
    throw new Error(`Remote tag for ${config.version} already exists!`)
  }

  if (!config.yolo) {
    // Re-install node modules using yarn.
    process.stdout.write('\n')
    await execa('yarn', ['--force'], stdio)

    // Run the lint script if it's defined in the project's package.json.
    if ($package.scripts && $package.scripts.lint) {
      process.stdout.write('\n')
      await execa('yarn', ['lint'], stdio)
    }

    // Run the test script if it's defined in the project's package.json.
    if ($package.scripts && $package.scripts.test) {
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
      : `release-${config.version}`

    // Checkout the release branch.
    process.stdout.write('\n')
    await execa('git', ['checkout', '-b', config.branch], stdio)
  }

  // Get the markdown summary of the commits since the last release before the
  // version commit is created.
  let releaseBody = ''
  try {
    const start = $package.version === '0.0.0' ? undefined : $package.version
    const { description, markdown } = await commits(start)
    if (!config.isVersionZero) {
      releaseBody += `${description.replace('HEAD', config.version)}:\n\n`
    }
    releaseBody += markdown
  } catch (err) {
    print.debug('Error fetching commits:', err)
  }

  // Update the package.json version and commit it.
  await updatePackage({ version: config.version })
  const { stdout: addOutput } = await execa('git', ['add', 'package.json'])
  print.debug('Version add output:\n', addOutput)
  const { stdout } = await execa('git', ['commit', '-m', config.version])
  print.debug('Version commit output:\n', stdout)

  // Push the version commit upstream.
  const { stdout: pushOutput } = await execa('git', ['push', '-u'])
  print.debug('Push output:\n', pushOutput)

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
    print.log('🔗', md(prLink), '\n')

    if (!config.yolo) {
      await prompts(
        {
          type: 'confirm',
          message: 'Proceed with publishing?',
          initial: true
        },
        { onCancel: () => process.exit(1) }
      )
    }
  }

  // Create and push the version tag to the remote if not publishing to the
  // GitHub Package Registry (since it creates a version tag automatically).
  const hasGpr = registries.includes('github') || (
    $package.publishConfig &&
    $package.publishConfig.registry &&
    $package.publishConfig.registry === gprUrl
  )
  if (!hasGpr) {
    const { stdout } = await execa('git', ['tag', config.version], stdio)
    print.debug('Tag output:\n', stdout)
    const pushArgs = ['push', 'origin', config.version]
    const { stdout: pushTag } = await execa('git', pushArgs, stdio)
    print.debug('Push tag output:\n', pushTag)
  }

  // Iterate over configured registries.
  for (let registry of registries) {
    process.stdout.write('\n')
    print.debug('Publishing to registry:', registry)

    // Allow specifying 'github' for GitHub Package Registry.
    registry = registry === 'github' ? 'https://npm.pkg.github.com/' : registry

    // If publishing to a non-npm registry, the registry URL needs to be
    // specified in the package.json's publishConfig field.
    if (registry !== 'npm') {
      await updatePackage({ publishConfig: { registry } })
    }

    // Publish the package.
    let publishArgs = ['publish', '--new-version', config.version]
    if (config.access) {
      publishArgs = publishArgs.concat(['--access', config.access])
    }
    await execa('yarn', publishArgs, stdio)

    // Remove any publishConfig changes to package.json now that it's been
    // published.
    if (registry !== 'npm') {
      await execa('git', ['checkout', '.'])
    }
  }

  // Create the release on GitHub.
  const releaseUrl = newGithubReleaseUrl({
    repoUrl,
    tag: config.version,
    body: releaseBody,
    isPrerelease: config.isPrerelease
  })
  print.debug('Release URL:', releaseUrl)

  // Print a success message letting the user know their package version has
  // be published.
  process.stdout.write('\n')
  print.success(`Published ${$package.name} ${config.version}!`)

  // Display the link to create a GitHub release.
  const releaseLink = `[Create a GitHub release for this tag!](${releaseUrl})`
  print.log('🔗', md(releaseLink), '\n')
}

module.exports = { precheck, release }
