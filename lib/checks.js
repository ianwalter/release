const execa = require('execa')
const {
  UncommitedChangesError,
  RemoteChangesError,
  LocalTagExistsError,
  RemoteTagExistsError
} = require('./errors')

// Check if there are uncommited changes in the current working directory.
async function uncommitedChangesCheck () {
  const { stdout } = await execa('git', ['status', '-s'])
  if (stdout !== '') {
    throw new UncommitedChangesError(stdout)
  }
}

// Check if there are unfetched changes in the remote repository.
async function remoteChangesCheck () {
  const remoteOptions = ['ls-remote', 'origin', 'HEAD']
  const { stdout } = await execa('git', remoteOptions)
  const [remoteRef] = stdout.split('\t')
  try {
    await execa('git', ['merge-base', '--is-ancestor', remoteRef, 'HEAD'])
  } catch (err) {
    throw new RemoteChangesError({ ...err, remoteRef })
  }
}

// Check if there is already a local tag for the new version.
async function localTagCheck (version) {
  const { stdout } = await execa('git', ['tag', '-l', version])
  if (stdout !== '') {
    throw new LocalTagExistsError(version, stdout)
  }
}

// Check if there is already a remote tag for the new version.
async function remoteTagCheck (version) {
  const ref = `refs/tags/${version}`
  const { stdout } = await execa('git', ['ls-remote', 'origin', ref])
  if (stdout !== '') {
    throw new RemoteTagExistsError(version, stdout)
  }
}

module.exports = {
  uncommitedChangesCheck,
  remoteChangesCheck,
  localTagCheck,
  remoteTagCheck
}
