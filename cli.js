#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const execa = require('execa')
const { print, md } = require('@ianwalter/print')
const { oneLine } = require('common-tags')
const latestVersion = require('latest-version')
const semver = require('semver')
const pkg = require('./package.json')
const { release } = require('.')

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

  await release({ packageJson, ...config })
}

run().catch(err => {
  print.error(err)
  if (err.output) {
    print.debug('Output', err.output)
  }
})
