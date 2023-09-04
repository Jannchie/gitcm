import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { exec } from 'node:child_process'
import os from 'node:os'
import { program } from 'commander'
import { consola } from 'consola'
import defaultConfig from './config.json' assert { type: 'json' }

program
  .name('gitcm')
  .usage('[type] [scope] [body]')
  .description('An opinionated git commit messages helper.')
  .option('-d, --dry-run', 'Dry run mode')
  .option('-y, --yes', 'Skip prompt')
  .option('-no-i, --no-icon', 'Do not show icon')
  .version('v0.1.0', '-V, --version', 'Output the current version')
  .arguments('[type] [scope] [body]')

program.parse()

let config = defaultConfig

const configPath = path.join(os.homedir(), '~/.config/gitcm/config.json')
if (!fs.existsSync(configPath)) {
  const dir = path.dirname(configPath)
  fs.mkdirSync(dir, { recursive: true })
  consola.info(`Config file not found. Create config file in ${configPath}`)
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}
else {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
}

const options = program.opts()
config.showIcon = !options.noIcon
config.verbose = options.verbose

const args = program.args

let type = ''
let scope = ''
let body = ''

if (args.length > 0) {
  type = args[0]
  if (args.length === 2) {
    body = args[1]
  }
  else if (args.length === 3) {
    scope = args[1]
    body = args[2]
  }
}
const typeList = Object.keys(config.data)

function isType(key: string): key is keyof typeof config.data {
  return key in config.data
}

function getCMD({ type, scope, body, icon }: { type: string; body: string; scope?: string; icon?: string }) {
  if (!scope || scope === '')
    return `git commit -m "${`${icon} `}${type}: ${body}"`
  return `git commit -m "${`${icon} `}${type}(${scope}): ${body}"`
}

async function waitPrompt() {
  if (!options.yes)
    await fillEmpty()

  await confirm()
}

async function confirm() {
  if (!isType(type)) {
    consola.error(`Invalid commit type: ${type}`, `Commit type must be one of ${typeList.join(', ')}`)
    process.exit(1)
  }
  const cmd = getCMD({ type: config.data[type].display, scope, body, icon: config.showIcon ? config.data[type].emoji : '' })
  const answer = options.yes ? true : await consola.prompt(`Are you sure to execute this command? (${cmd})`, { type: 'confirm', initial: true })
  if (typeof answer === 'symbol') {
    consola.info('Canceled')
    process.exit(0)
  }
  if (answer) {
    if (options.dryRun) {
      consola.info(`Dry run: ${cmd}`)
    }
    else {
      exec(cmd, (err, stdout) => {
        if (err) {
          consola.error(stdout)
          return
        }
        consola.success(stdout)
      })
    }
  }
  else {
    consola.info('Canceled')
  }
}

async function fillEmpty() {
  if (type === '') {
    type = await consola.prompt('What is the commit type? (required)', { type: 'select', options: typeList })

    // check type is clack:cancel
    if (typeof type === 'symbol') {
      consola.info('Canceled')
      process.exit(0)
    }
    if (!isType(type)) {
      consola.error(`Invalid commit type: ${type}`, `Commit type must be one of ${typeList.join(', ')}`)
      process.exit(1)
    }
  }

  if (scope === '' && args.length !== 2)
    scope = await consola.prompt('What is the commit scope? (optional)', { type: 'text', default: '', placeholder: 'Enter commit scope' })
  // check type is clack:cancel
  if (typeof scope === 'symbol') {
    consola.info('Canceled')
    process.exit(0)
  }

  if (body === '')
    body = await consola.prompt('What is the commit for? (required)', { type: 'text', default: '', placeholder: 'Enter commit body' })
  if (typeof body === 'symbol') {
    consola.info('Canceled')
    process.exit(0)
  }
  if (body === '') {
    consola.error('Commit body must not be empty')
    process.exit(1)
  }
}
waitPrompt()
