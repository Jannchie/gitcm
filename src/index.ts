import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { exec } from 'node:child_process'
import os from 'node:os'
import { program } from 'commander'
import { confirm, intro, isCancel, log, note, select, spinner, text } from '@clack/prompts'
import { emojify } from 'node-emoji'
import defaultConfig from './config.json' assert { type: 'json' }

const version = process.env.npm_package_version

let config = defaultConfig
const configPath = path.join(os.homedir(), '.config/gitcm/config.json')
function getLatestVersion() {
  return new Promise<string>((resolve, reject) => {
    exec('npm view @gitcm/cli version', (err, stdout) => {
      if (err) {
        reject(err)
        return
      }
      resolve(stdout.trim())
    })
  })
}

if (!fs.existsSync(configPath)) {
  const dir = path.dirname(configPath)
  fs.mkdirSync(dir, { recursive: true })
  log.info(`Config file not found. Create config file in ${configPath}`)
  fs.writeFileSync(configPath, JSON.stringify({}, null, 2))
}
else {
  log.info(`Config file found in ${configPath}`)
  const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as typeof config
  config = { ...config, ...userConfig }
}

const latestVersionPromise = getLatestVersion()
program
  .name('git-commit')
  .usage('[type] [scope] [body]')
  .description('An opinionated git commit messages helper.')
  .option('-d, --dry-run', 'Dry run mode')
  .option('-y, --yes', 'Skip prompt')
  .option('-no-i, --no-icon', 'Do not show icon')
  .version(`v${version}`, '-V, --version', 'Output the current version')
  .arguments('[type] [scope] [body]')

program.parse()

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

function getDisplay(type: string) {
  if (!isType(type))
    return type
  return config.data[type].display
}

function isSelectable(type: string) {
  if (!isType(type))
    return false
  return config.data[type].selectable
}

function getEmoji(type: string) {
  if (!isType(type))
    return ''
  switch (config.data[type].emoji) {
    case ':adhesive_bandage:':
      return '🩹'
  }
  return emojify(config.data[type].emoji)
}

function isType(key: string): key is keyof typeof config.data {
  return key in config.data
}

function getCMD({ type, scope, body, icon }: { type: string; body: string; scope?: string; icon?: string }) {
  if (!scope || scope === '')
    return `git commit -m "${`${icon} `}${type}: ${body}"`
  return `git commit -m "${`${icon} `}${type}(${scope}): ${body}"`
}

async function waitPrompt() {
  intro(`@gitcm/cli - v${version}`)

  if (type !== '' && !isType(type)) {
    log.error(`Invalid commit type: ${type}. ` + `Commit type must be one of ${typeList.join(', ')}`)
    process.exit(1)
  }
  if (!options.yes)
    await fillEmpty()
  await waitConfirm()
  await checkNewVersion()
  log.info('Done')
}

async function waitConfirm() {
  if (!isType(type)) {
    log.error(`Invalid commit type: ${type}. ` + `Commit type must be one of ${typeList.join(', ')}`)
    process.exit(1)
  }
  const cmd = getCMD({ type: config.data[type].display, scope, body, icon: config.showIcon ? config.data[type].emoji : '' })
  note(cmd, 'Your commit command is')
  const answer = config.needConfirm ? (options.yes ? true : await confirm({ message: 'Are you sure to execute this command?' })) : true
  if (isCancel(answer)) {
    log.info('Canceled by user')
    process.exit(0)
  }
  if (answer) {
    if (options.dryRun) {
      log.info(`Dry run: ${cmd}`)
    }
    else {
      try {
        await new Promise<void>((resolve, reject) => {
          exec(cmd, (err, stdout) => {
            if (err) {
              log.error(stdout)
              reject(err)
              return
            }
            log.success(stdout)
            resolve()
          })
        })
      }
      catch (e) {
        log.error(`${e}`)
        process.exit(1)
      }
    }
  }
  else {
    log.info('Canceled by user')
  }
}

async function fillEmpty() {
  if (type === '') {
    const typeRes = await select<{ value: string; label: string }[], string>({
      message: 'What is the commit type? (required)',
      options: typeList.filter(isSelectable).map((d) => {
        return {
          value: d,
          label: `${getEmoji(d)} ${getDisplay(d)}`,
        }
      }),
    })
    if (isCancel(typeRes)) {
      log.info('Canceled by user')
      process.exit(0)
    }
    type = typeRes
    if (!isType(type)) {
      log.error(`Invalid commit type: ${type}. ` + `Commit type must be one of ${typeList.join(', ')}`)
      process.exit(1)
    }
  }

  if (scope === '' && args.length !== 2) {
    const res = await text({
      message: 'What is the commit scope? (optional)',
      placeholder: 'No scope',
      defaultValue: '',
    })
    if (isCancel(res)) {
      log.info('Canceled by user')
      process.exit(0)
    }
    scope = res.trim()
  }

  if (body === '') {
    const res = await text({
      message: 'What is the commit body? (required)',
      placeholder: 'Enter commit body',
      defaultValue: '',
      validate: (value) => {
        if (value.trim() === '')
          return 'Commit body cannot be empty'
      },
    })
    if (isCancel(res)) {
      log.info('Canceled by user')
      process.exit(0)
    }
    body = res.trim()
  }
}

async function checkNewVersion() {
  const s = spinner()
  s.start('Checking new version')
  const latestVersion = await latestVersionPromise
  if (latestVersion !== version) {
    note(`New version v${latestVersion} is available. Run "npm i -g @gitcm/cli" to update`)
    s.stop('New version available')
  }
  else {
    s.stop('Version is up to date')
  }
}

await waitPrompt()
