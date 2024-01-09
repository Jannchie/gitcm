import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { exec } from 'node:child_process'
import os from 'node:os'
import { program } from 'commander'
import { confirm, intro, isCancel, log, note, outro, select, spinner, text } from '@clack/prompts'
import { emojify } from 'node-emoji'
import defaultConfig from './config.json' assert { type: 'json' }
import type { Config } from './type.ts'
import { generateByAI } from './ai.ts'
import { getCMD } from './git.ts'

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

const userConfig: Partial<Config> = getUserConfig()
config = { ...config, ...userConfig }
const latestVersionPromise = getLatestVersion()
const typeList = Object.keys(config.data)

program
  .name('git-commit')
  .description('An opinionated git commit messages helper.')
  .option('-d, --dry-run', 'Dry run mode')
  .option('-y, --yes', 'Skip prompt')
  .option('-a, --ai', 'AI mode')
  .option('-no-i, --no-icon', 'Do not show icon')
  .option('-v, --verbose', 'Verbose mode')
  .version(`v${version}`, '-V, --version', 'Output the current version')
  .arguments('[type] [body|scope] [body]').action(async (type = '', scope = '', body = '') => {
    const options = program.opts()
    config.showIcon = !options.noIcon
    config.verbose = options.verbose
    config.ai.enabled = options.ai
    config.dryRun = options.dryRun

    intro(`@gitcm/cli - v${version}`)
    if (config.ai.enabled) {
      checkAI()
      await generateByAI(config, type, scope)
    }
    else {
      if (body === '') {
        body = scope
        scope = ''
      }
      await waitPrompt(config, type, scope, body)
    }
  })
  .command('env <name> <value>').action(async (name: string, value: string) => {
    intro(`@gitcm/cli - v${version}`)
    if (name === 'AZURE_OPENAI_API_KEY' || name === 'AZURE_OPENAI_ENDPOINT' || name === 'OPENAI_API_KEY' || name === 'OPENAI_ENDPOINT' || name === 'OPENAI_MODEL') {
      const userConfig = getUserConfig()
      if (!userConfig.ai) {
        userConfig.ai = {
          enabled: false,
          env: {
            [name]: value,
          },
        }
      }
      else {
        if (!userConfig.ai.env)
          userConfig.ai.env = {}
        userConfig.ai.env[name] = value
      }
      fs.writeFileSync(configPath, JSON.stringify(userConfig, null, 2))
      log.success(`Set ${name} success`)
    }
    else {
      log.error(`Invalid env name: ${name}\nEnv name must be one of AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, OPENAI_API_KEY, OPENAI_ENDPOINT, OPENAI_MODEL`)
      outro('Please try again.')
      process.exit(1)
    }
    outro('Done')
    process.exit(0)
  })

program.parse()

function checkAI() {
  if (hasEnv()) {
    log.info('Try to use LLM API to generate commit message.')
  }
  else {
    log.error('AI mode enabled but no env found.')
    log.message('Please set env variables AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT or OPENAI_API_KEY, OPENAI_ENDPOINT and OPENAI_MODEL\nYou can edit the config file at ~/.config/gitcm/config.json\nOr, you can run the following command to set the env variables:')
    log.message('   npx @gitcm/cli env <name> <value>\nor gitcm env <name> <value>\nor git-commit env <name> <value>')
    outro('Please add env variables and try again.')
    process.exit(1)
  }
}

function getUserConfig() {
  let userConfig: Partial<Config> = {}
  if (!fs.existsSync(configPath)) {
    const dir = path.dirname(configPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify({}, null, 2))
  }
  else {
    userConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  }
  return userConfig
}

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

async function waitPrompt(config: Config, type: string, scope: string, body: string) {
  if (type !== '' && !isType(type)) {
    log.error(`Invalid commit type: ${type}. ` + `Commit type must be one of ${typeList.join(', ')}`)
    process.exit(1)
  }
  const { type: t, scope: s, body: b } = await fillEmpty(type, scope, body)

  const LAST_CHECK_FILE = path.join(os.homedir(), '.config/gitcm/lastCheckTime.txt')
  let lastCheckTime = null
  if (fs.existsSync(LAST_CHECK_FILE))
    lastCheckTime = new Date(fs.readFileSync(LAST_CHECK_FILE, 'utf8'))
  else
    lastCheckTime = null

  const now = new Date()
  const oneDay = 24 * 60 * 60 * 1000 // 一天的毫秒数

  if (lastCheckTime === null || (now.getTime() - lastCheckTime.getTime() > oneDay)) {
    await waitConfirm(config, t, s, b)
    await checkNewVersion()
    lastCheckTime = new Date()
    fs.writeFileSync(LAST_CHECK_FILE, lastCheckTime.toISOString())
  }
  log.info('Done')
}

async function waitConfirm(config: Config, type: string, scope: string | undefined, body: string) {
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
    const typeRes = await select<{ value: string, label: string }[], string>({
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
  return { type, scope, body }
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
