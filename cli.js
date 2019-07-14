#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const execa = require('execa')
const { print } = require('@ianwalter/print')
const prompts = require('prompts')
const semver = require('semver')
const release = require('.')

async function run () {
  const { $package, ...config } = cli({ name: 'release' })

  if (config._.length) {
    config.version = config.length[1]
    delete config._
  }

  await execa('commits', [`v${$package.version}`], { stdio: 'inherit' })
  process.stdout.write('\n')

  if (config.version) {
    // TODO: check if it's higher than current version
  } else {
    const patch = semver.inc($package.version, 'patch')
    const minor = semver.inc($package.version, 'minor')
    const major = semver.inc($package.version, 'major')
    const prePatch = semver.inc($package.version, 'prepatch')
    const preMinor = semver.inc($package.version, 'preminor')
    const preMajor = semver.inc($package.version, 'premajor')

    const { version } = await prompts({
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
    })

    Object.assign(config, version)
  }

  await release({ $package, ...config })

  print.log(config)
}

run().catch(err => print.error(err))
