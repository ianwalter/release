# @ianwalter/release
> CLI workflow for releasing JavaScript packages

![Screenshot](screenshot.png)

## About

**HEAVILY** inspired by [np][npUrl] but with the following features:

* Focus on [`yarn`][yarnUrl] (and [`lerna`][lernaUrl] in the future)
* A release branch workflow to help with GitHub master branch protections
* Support for multiple (and external) registries

## Workflow

- [x] Check and fail if there are uncommited changes in the working directory
- [x] Check and fail if upstream has new commits
- [x] Display commits and prompt for a new semantic version if one wasn't
      specified as the first arugment
- [x] Check and fail if tags already exist locally or on remote
- [x] Re-install dependencies
- [x] Run lint if there's a lint script
- [x] Run tests if there's a test script
- [x] If `--branch` is specified, create a release branch, push it, link to a
      new PR, and prompt for a confirmation to publish
- [x] Update the version in `package.json` and commit the version bump
- [x] Create a tag and push it up
- [x] Publish the package and display a link to create a new GitHub release with
      the tag from the previous step
- [x] If `--yolo` is specified, most of checks are skipped and the last 3 steps
      are executed

## Installation

```console
yarn add @ianwalter/release --dev
```

## Multiple Registries

You can specify that your package be published to multiple registries by
configuring `release` in your package.json, for example:

```js
{
  "release": {
    "registries": [
      "npm",
      "github",
      "https://some.other.registry.com/"
    ]
  }
}
```

You can specify `npm` for npm and `github` for GitHub Package Registry.
Otherwise, specify the registry URL.

[npUrl]: https://github.com/sindresorhus/np
[yarnUrl]: https://yarnpkg.com/en/
[lernaUrl]: https://lerna.js.org/
