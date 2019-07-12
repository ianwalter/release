#!/usr/bin/env node

const cli = require('@ianwalter/cli')
const { print } = require('@ianwalter/print')
const prompts = require('prompts')

async function run () {
  const config = cli({ name: 'release' })

  if (!config.version) {
    Object.assign(config, await prompts({
      type: 'select',
      name: 'version',
      message: 'Select the semantic version to publish',
      choices: [
        { title: 'Patch', value: '#ff0000' },
        { title: 'Minor', value: '#00ff00' },
        { title: 'Major', value: '#0000ff' },
        { title: 'Pre-patch', value: '#0000ff' },
        { title: 'Pre-minor', value: '#0000ff' },
        { title: 'Pre-major', value: '#0000ff' }
      ]
    }))
  }

  print.log(config)
}

run().catch(err => print.error(err))
