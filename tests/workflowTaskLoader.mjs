import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolvePath(new URL('..', import.meta.url).pathname.slice(1))
const doublesUrl = pathToFileURL(resolvePath(root, 'tests/workflowTaskDoubles.ts')).href

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/api/request') {
    return { url: doublesUrl, shortCircuit: true }
  }

  if (specifier.startsWith('@/')) {
    const sourcePath = specifier.slice(2)
    return {
      url: pathToFileURL(resolvePath(root, `src/${sourcePath}.ts`)).href,
      shortCircuit: true
    }
  }

  return nextResolve(specifier, context)
}
