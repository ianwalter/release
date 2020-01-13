const { getVersion, getAccess } = require('./lib/prompts')
const { changesChecks, tagsChecks, release } = require('./lib/release')
const {
  UncommitedChangesError,
  RemoteChangesError,
  LocalTagExistsError,
  RemoteTagExistsError
} = require('./lib/errors')

module.exports = {
  getVersion,
  getAccess,

  changesChecks,
  tagsChecks,
  release,

  UncommitedChangesError,
  RemoteChangesError,
  LocalTagExistsError,
  RemoteTagExistsError
}
