# @ianwalter/release
> CLI workflow for releasing JavaScript packages

## About

**HEAVILY** inspired by [np][npUrl] but with a focus on `yarn` and better
support for branch protections and private registries.

## Workflow

- [x] Check and fail if there are uncommited changes in the working directory.
- [x] Check and fail if upstream has new commits.
- [x] Display commits and prompt for a new semantic version if one wasn't
      specified as the first arugment.
- [ ] Check and fail if tags already exist locally or on remote.
- [x] Remove and re-install dependencies.
- [x] Run tests if there's a test script.
- [x] Update the version in `package.json` and commit the version bump.
- [ ] If `--branch` is specified, create a release branch, push it, link to a
      new PR, and prompt for a confirmation to publish.
- [x] Create a tag and push it up.
- [x] Publish the package and display a link to create a new GitHub release with
      the tag from the previous step.
- [ ] If `--yolo` is specified, only the last 2 steps are executed.
