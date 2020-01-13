const BaseError = require('@ianwalter/base-error')

class ExecaError extends BaseError {
  constructor (message, output) {
    super(message)
    this.output = output
  }
}

class UncommitedChangesError extends ExecaError {
  constructor (output) {
    super('Uncommited changes!', output)
  }
}

class RemoteChangesError extends ExecaError {
  constructor (output) {
    super('Unfetched changes in remote!', output)
  }
}

class LocalTagExistsError extends ExecaError {
  constructor (version, output) {
    super(`Local tag for ${version} already exists!`, output)
  }
}

class RemoteTagExistsError extends ExecaError {
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
