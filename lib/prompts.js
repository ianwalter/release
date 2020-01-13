const { oneLine } = require('common-tags')
const semver = require('semver')
const prompts = require('prompts')

// Warn the user about adding the access flag if this looks like it might be
// the first time this package is being published.
async function getAccess () {
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
    {
      onCancel: () => {
        process.stdout.write('\n')
        process.exit(1)
      }
    }
  )
  return access
}

async function getVersion (packageJson) {
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
  return version
}

module.exports = { getVersion, getAccess }
