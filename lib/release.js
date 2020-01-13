const { Print, md } = require('@ianwalter/print')
const execa = require('execa')
const newGithubReleaseUrl = require('new-github-release-url')
const commits = require('@ianwalter/commits')
const prompts = require('prompts')
const updatePackage = require('@ianwalter/update-package')
const {
  uncommittedChangesCheck,
  remoteChangesCheck,
  localTagCheck,
  remoteTagCheck
} = require('./checks')
const { getVersion, getAccess } = require('./prompts')
const { install, lint, test } = require('./stages')

const stdio = { stdio: 'inherit' }
const gprUrl = 'https://npm.pkg.github.com/'

async function changesChecks () {
  await uncommittedChangesCheck()
  await remoteChangesCheck()
}

async function tagsChecks (version) {
  await localTagCheck(version)
  await remoteTagCheck(version)
}

// Update the package.json version and commit it.
async function commitVersionUpdate (version) {
  await updatePackage({ version: version })
  await execa('git', ['add', 'package.json'])
  await execa('git', ['commit', '-m', version])
}

// Get the markdown summary of the commits since the last release before the
// version commit is created.
async function getReleaseBody (start, end, isVersionZero) {
  const result = await commits(isVersionZero ? undefined : start, end)
  const description = isVersionZero ? `v${end}` : result.description
  return description + ':\n\n' + result.markdown
}

async function release (config) {
  const print = new Print({ level: config.logLevel || 'info' })

  // Checkout master.
  await execa('git', ['checkout', 'master'])

  // Perform git changes checks.
  if (!config.yolo) {
    await changesChecks()
  }

  // Destructure and add defaults to config properties.
  const { packageJson, registries = ['npm'] } = config

  // TODO: comment
  if (!config.version) {
    config.version = getVersion(config.packageJson)
  }

  // TODO: comment
  config.isVersionZero = config.version === '0.0.0'
  if (config.isVersionZero) {
    config.access = getAccess(config.version)
  }

  // Perform git tag checks.
  await tagsChecks(config.version)

  // TODO: comment
  if (!config.yolo) {
    await install()
    await lint(config)
    await test(config)
  }

  // Perform the changes checks again just in case the remote was updated or
  // ruhning tests created a change (e.g. snapshot files).
  if (!config.yolo) {
    await changesChecks()
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

  // TODO: comment
  await commitVersionUpdate()

  // TODO: comment
  let releaseBody
  try {
    releaseBody = await getReleaseBody(
      packageJson.version,
      config.version,
      config.isVersionZero
    )
  } catch (err) {
    print.warn('Error getting commits', err)
  }

  // Push the version commit upstream.
  await execa('git', ['push', '-u'])

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
    packageJson.publishConfig &&
    packageJson.publishConfig.registry &&
    packageJson.publishConfig.registry === gprUrl
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
  print.success(`Published ${config.packageJson.name} ${config.version}!`)

  // Display the link to create a GitHub release.
  const releaseLink = `[Create a GitHub release for this tag!](${releaseUrl})`
  print.log('🔗', md(releaseLink), '\n')
}

module.exports = { changesChecks, tagsChecks, release }
