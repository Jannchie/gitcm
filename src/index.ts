import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { exec } from 'node:child_process'
import os from 'node:os'
import { program } from 'commander'
import { confirm, intro, isCancel, log, note, outro, select, spinner, text } from '@clack/prompts'
import { emojify } from 'node-emoji'
import defaultConfig from './config.json' assert { type: 'json' }

const version = process.env.npm_package_version

let config: Config = defaultConfig
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

const typeList = Object.keys(config.data)

program
  .name('git-commit')
  .usage('[type] [scope] [body]')
  .description('An opinionated git commit messages helper.')
  .option('-d, --dry-run', 'Dry run mode')
  .option('-y, --yes', 'Skip prompt')
  .option('-a, --ai', 'AI mode')
  .option('-no-i, --no-icon', 'Do not show icon')
  .version(`v${version}`, '-V, --version', 'Output the current version')
  .arguments('<type> [body|scope] [body]').action(async (type, scope = '', body = '') => {
    const options = program.opts()
    if (body === '') {
      body = scope
      scope = ''
    }
    config.showIcon = !options.noIcon
    config.verbose = options.verbose
    config.ai.enabled = options.ai
    config.dryRun = options.dryRun

    if (config.ai.enabled) {
      if (hasEnv()) {
        log.info('AI mode enabled')
      }
      else {
        log.error('AI mode enabled but no env found.')
        log.message('Please set env variables AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT or OPENAI_API_KEY, OPENAI_ENDPOINT and OPENAI_MODEL\nYou can edit the config file at ~/.config/ai-cmd-runner/config.json\nOr, you can run the following command to set the env variables:')
        log.message('  run env <name> <value>')
        outro('')
        process.exit(1)
      }
    }

    await waitPrompt(config, type, scope, body)
  })

program.parse()

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

function isType(key: string) {
  return typeList.includes(key)
}

function getCMD({ type, scope, body, icon }: { type: string; body: string; scope?: string; icon?: string }) {
  if (!scope || scope === '')
    return `git commit -m "${`${icon} `}${type}: ${body}"`
  return `git commit -m "${`${icon} `}${type}(${scope}): ${body}"`
}

async function waitPrompt(config: Config, type: string, scope: string, body: string) {
  intro(`@gitcm/cli - v${version}`)

  if (type !== '' && !isType(type)) {
    log.error(`Invalid commit type: ${type}. ` + `Commit type must be one of ${typeList.join(', ')}`)
    process.exit(1)
  }
  await fillEmpty(type, scope, body)
  await waitConfirm(config, type, scope, body)
  await checkNewVersion()
  log.info('Done')
}

async function waitConfirm(config: Config, type: string, scope: string, body: string) {
  if (!isType(type)) {
    log.error(`Invalid commit type: ${type}. ` + `Commit type must be one of ${typeList.join(', ')}`)
    process.exit(1)
  }
  const cmd = getCMD({ type: config.data[type].display, scope, body, icon: config.showIcon ? config.data[type].emoji : '' })
  note(cmd, 'Your commit command is')
  const answer = config.needConfirm ? (!config.needConfirm ? true : await confirm({ message: 'Are you sure to execute this command?' })) : true
  if (isCancel(answer)) {
    log.info('Canceled by user')
    process.exit(0)
  }
  if (answer) {
    if (config.dryRun) {
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

async function fillEmpty(type: string, scope?: string, body?: string) {
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

  if (body === '') {
    if (!scope || scope === '') {
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
  }

  if (!body || body === '') {
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

function getDiffOfCurrentGit() {
  return new Promise<string>((resolve, reject) => {
    exec('git diff --cached', (err, stdout) => {
      if (err) {
        reject(err)
        return
      }
      resolve(stdout)
    })
  })
}

function hasEnv() {
  if (config.ai.env.AZURE_OPENAI_API_KEY && config.ai.env.AZURE_OPENAI_ENDPOINT) {
    // Azure
    return true
  }
  else if (config.ai.env.OPENAI_API_KEY && config.ai.env.OPENAI_ENDPOINT && config.ai.env.OPENAI_MODEL) {
    // OpenAI
    return true
  }
  return false
}

interface AIConfigEnv {
  AZURE_OPENAI_API_KEY?: string
  AZURE_OPENAI_ENDPOINT?: string
  OPENAI_API_KEY?: string
  OPENAI_ENDPOINT?: string
  OPENAI_MODEL?: string
}

interface Config {
  showIcon: boolean
  verbose: boolean
  needConfirm: boolean
  dryRun: boolean
  ai: {
    enabled: boolean
    env: AIConfigEnv
  }
  data: {
    [key: string]: {
      display: string
      emoji: string
      selectable: boolean
    }
  }
}
