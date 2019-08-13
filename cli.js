#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const execa = require('execa')
const { print } = require('@ianwalter/print')
const prompts = require('prompts')
const semver = require('semver')
const { oneLine } = require('common-tags')
const { precheck, release } = require('.')

async function run () {
  // Build the config.
  const { $package, ...config } = cli({ name: 'release' })

  // Warn the user about adding the access flag if this looks like it might be
  // the first time this package is being published.
  config.isVersionZero = $package.version === '0.0.0'
  if (config.isVersionZero && !config.access) {
    print.warn(oneLine`
      If this is the first time publishing this package and you intend to make
      it publicly available on npm, make sure to add --access public
    `)
  }

  if (!config.yolo) {
    // Run the precheck that checks for git issues before doing anything.
    await precheck(config)
  }

  // Display the list of commits added since the last version was published.
  if (config.isVersionZero) {
    await execa('commits', ['100'], { stdio: 'inherit' })
  } else {
    await execa('commits', [`v${$package.version}`], { stdio: 'inherit' })
  }
  process.stdout.write('\n')

  // If there was an argument passed to the command, attempt to use it as the
  // new version number.
  if (config._.length) {
    const version = config._[0]
    if (semver.valid(version)) {
      if (semver.lt(version, $package.version)) {
        print.warn(oneLine`
          The specified version \`${version}\` is lower than the current
          version \`${$package.version}>\`
        `)
      }
      config.version = version
    } else {
      print.error(oneLine`
        The specified version <${version}> is not a valid semantic version
      `)
    }
    delete config._
  }

  if (!config.version) {
    const patch = semver.inc($package.version, 'patch')
    const minor = semver.inc($package.version, 'minor')
    const major = semver.inc($package.version, 'major')
    const prePatch = semver.inc($package.version, 'prepatch')
    const preMinor = semver.inc($package.version, 'preminor')
    const preMajor = semver.inc($package.version, 'premajor')

    const { version } = await prompts(
      {
        type: 'select',
        name: 'version',
        message: 'Select the semantic version to publish',
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

  await release({ $package, ...config })
}

run().catch(err => print.error(err))
