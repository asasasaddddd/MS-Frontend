import { pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'

const root = resolvePath(new URL('..', import.meta.url).pathname.slice(1))
const doublesUrl = pathToFileURL(resolvePath(root, 'tests/scanTestDoubles.ts')).href
const requestUrl = pathToFileURL(resolvePath(root, 'src/api/request.ts')).href

function isRequestModule(specifier) {
  return specifier === '@/api/request'
    || specifier === requestUrl
    || specifier.replaceAll('\\', '/').endsWith('/src/api/request.ts')
}

export async function resolve(specifier, context, nextResolve) {
  if (isRequestModule(specifier)) {
    return { url: doublesUrl, shortCircuit: true }
  }

  if (specifier.startsWith('@/')) {
    return {
      url: pathToFileURL(resolvePath(root, `src/${specifier.slice(2)}.ts`)).href,
      shortCircuit: true
    }
  }

  return nextResolve(specifier, context)
}
