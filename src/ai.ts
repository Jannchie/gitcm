import { exec } from 'node:child_process'
import process from 'node:process'
import { createJsonTranslator, createLanguageModel } from 'typechat'
import { confirm, isCancel, log, note, spinner } from '@clack/prompts'
import type { AIConfigEnv, Config } from './type.ts'
import { getCMD } from './git.ts'

function getLanguageModel(env: Record<string, string>) {
  const model = createLanguageModel(env)
  return model
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

export interface CommitMessageData {
  type: string
  scope: string
  message: string
}

export async function generateByAI(config: Config, type: string, scope: string, message: string) {
  const typeList = Object.keys(config.data)
  const verbose = config.verbose
  const s = spinner()
  s.start('Check git status...')
  const diff = await getDiffOfCurrentGit()
  const lines = diff.split('\n')
  if (diff.length > 2000 || lines.length > 60) {
    log.warn('The diff is too long. It\'s better to write the commit message by yourself.')
    process.exit(0)
  }
  let prompt = `${diff} I will generate a commit message about above diff. It should has three parts: type, scope and message. The type is ${type}. \nThe git commit I will to generate is`
  if (type === '')
    prompt = `${diff}, I will generate a commit message about above diff. It should has three parts: type, scope and message. Type is one of ${typeList.join(', ')}.\nThe git commit I will to generate is`
  s.message('Generating commit message...')
  const model = getLanguageModel(config.ai.env as Record<string, string>)

  const textResp = await model.complete(prompt)
  if (!textResp.success) {
    log.error('AI response failed.')
    process.exit(1)
  }

  if (verbose) {
    log.info('Prompt is:')
    log.message(prompt)
    log.info('AI response is:')
    log.message(textResp.data)
  }
  s.message('Parsing commit message...')
  try {
    const translatorResp = await createJsonTranslator<CommitMessageData>(model, 'export interface CommitMessageData { type: string; scope: string; message: string }', 'CommitMessageData').translate(textResp.data)
    if (!translatorResp.success) {
      log.error('AI response failed.')
      process.exit(1)
    }

    const data = translatorResp.data
    scope = data.scope
    type = data.type
    message = data.message
    const cmd = getCMD({ type, scope, body: message, icon: config.showIcon ? config.data[type].emoji : '' })
    s.stop('Generated')
    note(cmd, 'The AI generated commit command is')
    const answer = await confirm({ message: 'Are you sure to execute this command?' })
    if (isCancel(answer) || !answer) {
      log.info('Canceled by user')
      process.exit(0)
    }
    if (config.dryRun) {
      log.info(`Dry run: ${cmd}`)
    }
    else {
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
  }
  catch (e) {
    log.error('AI response failed.')
    log.error(`${e}`)
    process.exit(1)
  }
}
