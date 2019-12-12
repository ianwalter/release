#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const execa = require('execa')
const { print, md } = require('@ianwalter/print')
const prompts = require('prompts')
const semver = require('semver')
const { oneLine } = require('common-tags')
const latestVersion = require('latest-version')
const pkg = require('./package.json')
const { precheck, release } = require('.')

async function run () {
  // Build the config.
  const { packageJson, ...config } = cli({
    name: 'release',
    usage: 'release [options]',
    options: {
      version: {
        alias: 'v'
      },
      branch: {
        alias: 'b'
      },
      logLevel: {
        alias: 'l',
        default: 'info'
      }
    }
  })

  // Display a warning message if the current release version is outdated.
  const latestReleaseVersion = await latestVersion('@ianwalter/release')
  if (semver.lt(pkg.version, latestReleaseVersion)) {
    process.stdout.write('\n')
    print.warn(
      'Warning!',
      md(oneLine`
        **The version of @ianwalter/release being used (\`${pkg.version}\`) is
        outdated, you should probably update to \`${latestReleaseVersion}\`
        before continuing to publish.**
      `)
    )
    process.stdout.write('\n')
  }

  // Warn the user about adding the access flag if this looks like it might be
  // the first time this package is being published.
  config.isVersionZero = packageJson.version === '0.0.0'
  if (config.isVersionZero) {
    const { access } = await prompts(
      {
        type: 'select',
        name: 'access',
        message: oneLine`
          If you are publishing this package to npm for the first time, select
          the access level, otherwise select skip:
        `,
        choices: [
          {
            title: 'Public',
            value: 'public'
          },
          {
            title: 'Private',
            value: 'private'
          },
          {
            title: 'Skip',
            value: null
          }
        ]
      },
      { onCancel: () => process.exit(1) }
    )
    config.access = access
  }

  if (!config.yolo) {
    // Run the precheck that checks for git issues before doing anything.
    await precheck(config)
  }

  // Display the list of commits added since the last version was published.
  if (config.isVersionZero) {
    await execa('commits', ['100'], { stdio: 'inherit' })
  } else {
    await execa('commits', [packageJson.version], { stdio: 'inherit' })
  }
  process.stdout.write('\n')

  // If there was an argument passed to the command, attempt to use it as the
  // new version number.
  if (config._.length) {
    const version = config._[0]
    if (semver.valid(version) && version[0] !== 'v') {
      if (semver.lt(version, packageJson.version)) {
        print.warn(oneLine`
          The specified version \`${version}\` is lower than the current
          version \`${packageJson.version}>\`
        `)
      }
      config.version = version
    } else {
      print.error(oneLine`
        The specified version \`${version}\` is not a valid semantic version
      `)
    }
    delete config._
  }

  if (!config.version) {
    const patch = semver.inc(packageJson.version, 'patch')
    const minor = semver.inc(packageJson.version, 'minor')
    const major = semver.inc(packageJson.version, 'major')
    const prePatch = semver.inc(packageJson.version, 'prepatch')
    const preMinor = semver.inc(packageJson.version, 'preminor')
    const preMajor = semver.inc(packageJson.version, 'premajor')

    const { version } = await prompts(
      {
        type: 'select',
        name: 'version',
        message: 'Select the semantic version to publish:',
        choices: [
          {
            title: `Patch\t${patch}`,
            value: { version: patch }
          },
          {
            title: `Minor\t${minor}`,
            value: { version: minor }
          },
          {
            title: `Major\t${major}`,
            value: { version: major }
          },
          {
            title: `Pre-patch\t${prePatch}`,
            value: { version: prePatch, isPrerelease: true }
          },
          {
            title: `Pre-minor\t${preMinor}`,
            value: { version: preMinor, isPrerelease: true }
          },
          {
            title: `Pre-major\t${preMajor}`,
            value: { version: preMajor, isPrerelease: true }
          }
        ]
      },
      { onCancel: () => process.exit(1) }
    )

    Object.assign(config, version)

    // Add a newline after the prompt output to separate it from the yarn
    // publish output.
    process.stdout.write('\n')
  }

  await release({ packageJson, ...config })
}

run().catch(err => print.error(err))
