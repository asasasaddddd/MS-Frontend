import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const faviconPath = new URL('../public/favicon.svg', import.meta.url)

assert.match(indexHtml, /<link[^>]+rel=["']icon["'][^>]+href=["']\/favicon\.svg["']/i)
assert.equal(existsSync(faviconPath), true)
assert.match(readFileSync(faviconPath, 'utf8'), /<svg[\s\S]*<\/svg>/i)
