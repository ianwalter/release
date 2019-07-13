#!/usr/bin/env node

const cli = require('@ianwalter/cli')
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

  if (config.version) {
    // TODO: check if it's higher than current version
  } else {
    const patch = semver.inc($package.version, 'patch')
    const minor = semver.inc($package.version, 'minor')
    const major = semver.inc($package.version, 'major')
    const prePatch = semver.inc($package.version, 'prepatch')
    const preMinor = semver.inc($package.version, 'preminor')
    const preMajor = semver.inc($package.version, 'premajor')
    Object.assign(config, await prompts({
      type: 'select',
      name: 'version',
      message: 'Select the semantic version to publish',
      choices: [
        { title: `Patch\t${patch}`, value: patch },
        { title: `Minor\t${minor}`, value: minor },
        { title: `Major\t${major}`, value: major },
        { title: `Pre-patch\t${prePatch}`, value: prePatch },
        { title: `Pre-minor\t${preMinor}`, value: preMinor },
        { title: `Pre-major\t${preMajor}`, value: preMajor }
      ]
    }))
  }

  await release({ $package, ...config })

  print.log(config)
}

run().catch(err => print.error(err))
