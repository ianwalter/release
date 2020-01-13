const BaseError = require('@ianwalter/base-error')

class CheckError extends BaseError {
  constructor (message, output) {
    super(message)
    this.output = output
  }
}

class UncommitedChangesError extends CheckError {
  constructor (output) {
    super('Uncommited changes!', output)
  }
}

class RemoteChangesError extends CheckError {
  constructor (output) {
    super('Unfetched changes in remote!', output)
  }
}

class LocalTagExistsError extends CheckError {
  constructor (version, output) {
    super(`Local tag for ${version} already exists!`, output)
  }
}

class RemoteTagExistsError extends CheckError {
  constructor (version, output) {
    super(`Remote tag for ${version} already exists!`, output)
  }
}

module.exports = {
  UncommitedChangesError,
  RemoteChangesError,
  LocalTagExistsError,
  RemoteTagExistsError
}
