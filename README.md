# @ianwalter/release
>

## About

HEAVILY inspired by [np][npUrl] but with a focus on `yarn` and better support
for branch protections and private registries.

1. Display commits and prompt for semver.
2. Check and fail if upstream has commits.
3. Run tests.
4. If branch is specified, create a release branch, push it, and prompt for
   publish confirmation.
5. Publish package and display GitHub release URL.

If --yolo is specified, just publish the package and display GitHub release URL.
