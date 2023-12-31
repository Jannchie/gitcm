import { exec } from 'node:child_process'
import process from 'node:process'
import { createJsonTranslator, createLanguageModel } from 'typechat'
import { confirm, isCancel, log, note, spinner } from '@clack/prompts'
import type { Config } from './type.ts'
import { getCMD } from './git.ts'

function getLanguageModel(env: Record<string, string>) {
  const model = createLanguageModel(env)
  return model
}

function getDiffOfCurrentGit() {
  return new Promise<string>((resolve, reject) => {
    exec('git diff --cached -U0', (err, stdout) => {
      if (err) {
        reject(err)
        return
      }
      resolve(stdout)
    })
  })
}

async function parseCommit() {
  const commitRegex = /(?<emoji>:.+:|(\uD83C[\uDF00-\uDFFF])|(\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF])|[\u2600-\u2B55])?( *)?(?<type>[a-z]+)(\((?<scope>.+)\))?(?<breaking>!)?: (?<description>.+)/i
  const commits = await getGitCommitList()
  function isNotNull<T>(x: T | null): x is T {
    return x !== null
  }
  const parsedCommits = commits.map((commit) => {
    const match = commit.match(commitRegex)
    if (!match?.groups)
      return null
    return match.groups
  }).filter(isNotNull)
  return parsedCommits as { emoji: string; type: string; scope: string; breaking: string; description: string }[]
}

async function getGitCommitList(n: number = 30) {
  const resp = await new Promise<string>((resolve, reject) => {
    exec(`git log -${n} --pretty=format:"%s"`, (err, stdout) => {
      if (err) {
        reject(err)
        return
      }
      resolve(stdout)
    })
  })
  return resp.split('\n')
}

export interface CommitMessageData {
  type: string
  scope: string
  message: string
}

export async function generateByAI(config: Config, type: string, scope: string) {
  const commits = await parseCommit()
  const scopeExample = [...new Set(commits.map(commit => commit.scope))].filter(scope => scope !== undefined && scope !== '')
  const typeList = Object.keys(config.data)
  const verbose = config.verbose
  const s = spinner()
  s.start('Check git status...')
  const diff = await getDiffOfCurrentGit()
  const lines = diff.split('\n')
  if (diff.length > 3000 || lines.length > 60) {
    log.warn('The diff is too long. It\'s better to write the commit message by yourself.')
    process.exit(0)
  }
  const model = getLanguageModel(config.ai.env as Record<string, string>)

  const p = `\`\`\`\n${diff}\`\`\`\nThis is a change I made, Use **one sentence** to summarize the type, scope, and content of the changes I made. Here is the summary: `

  s.message('Describing...')
  const descResp = await model.complete(p)
  if (!descResp.success) {
    log.error('AI response failed.')
    process.exit(1)
  }

  if (verbose) {
    log.info('Prompt is:')
    log.message(p)
    log.info('AI response is:')
    log.message(descResp.data)
  }

  let prompt = `\`\`\`\n${descResp.data}\`\`\`\nThis is my change. 
I need to extract three of these elements from the summary: type, scope, and message.
The type should be ${type}. 
The scope should be ${scope === '' ? `a noun or multiple comma-separated nouns(e.g. ${scopeExample.join(', ')}).` : scope}, it should not be empty, 'N/A' or 'None'.
The message contains only few words.
Based on the information above, type, scope and message respectively:`
  if (type === '') {
    prompt = `\`\`\`\n${descResp.data}\`\`\`\nThis is my change.
I need to extract three of these elements from the summary: type, scope, and message.
The type of commit is in ${typeList.join(', ')}. 
The scope should be a noun or multiple comma-separated nouns(e.g. ${scopeExample.join(', ')}), it should not be empty, 'N/A' or 'None'.
The message contains only few words.
Based on the information above, type, scope and message respectively:
`
  }
  s.message('Generating commit message...')

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
    if (scope === '')
      scope = data.scope.toLowerCase()
    if (type === '')
      type = data.type.toLowerCase()
    let message = data.message
    message = message[0].toLowerCase() + message.slice(1)
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
      process.exit(0)
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
      process.exit(0)
    }
  }
  catch (e) {
    log.error('AI response failed.')
    log.error(`${e}`)
    process.exit(1)
  }
}
