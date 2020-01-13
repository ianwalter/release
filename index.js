const { getVersion, getAccess } = require('./lib/prompts')
const { changesChecks, tagsChecks, release } = require('./lib/release')

module.exports = {
  getVersion,
  getAccess,

  changesChecks,
  tagsChecks,
  release
}
