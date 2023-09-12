export interface AIConfigEnv {
  AZURE_OPENAI_API_KEY?: string
  AZURE_OPENAI_ENDPOINT?: string
  OPENAI_API_KEY?: string
  OPENAI_ENDPOINT?: string
  OPENAI_MODEL?: string
}

export interface Config {
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
