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

  if (!config.yolo) {
    // Run the precheck that checks for git issues before doing anything.
    await precheck()
  }

  // Display the list of commits added since the last version was published.
  await execa('commits', [`v${$package.version}`], { stdio: 'inherit' })
  process.stdout.write('\n')

  // If there was an argument passed to the command, attempt to use it as the
  // new version number.
  if (config._.length) {
    const version = config._[0]
    if (semver.valid(version)) {
      if (semver.lt(version, $package.version)) {
        print.warn(oneLine`
          The specified version <${version}> needs to be higher than the current
          version <${$package.version}>
        `)
      } else {
        config.version = version
      }
    } else {
      print.warn(oneLine`
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
        ],
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
