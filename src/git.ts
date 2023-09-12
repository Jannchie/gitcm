export function getCMD({ type, scope, body, icon }: { type: string; body: string; scope?: string; icon?: string }) {
  if (!scope || scope === '')
    return `git commit -m "${`${icon} `}${type}: ${body}"`
  return `git commit -m "${`${icon} `}${type}(${scope}): ${body}"`
}
