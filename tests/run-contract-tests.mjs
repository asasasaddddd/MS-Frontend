import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Absolute directory containing the frontend contract tests. */
const testDirectory = dirname(fileURLToPath(import.meta.url))
/** Stable test-file order used to make local and CI output reproducible. */
const testFiles = readdirSync(testDirectory)
  .filter((fileName) => fileName.endsWith('.test.ts'))
  .sort((left, right) => left.localeCompare(right))

if (testFiles.length === 0) {
  console.error('No frontend contract test files were found.')
  process.exit(1)
}

for (const testFile of testFiles) {
  /** Child process result for one independently executable TypeScript contract test. */
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', join(testDirectory, testFile)],
    { stdio: 'inherit' },
  )

  if (result.error) {
    console.error(`Failed to start contract test ${testFile}:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`Contract test failed: ${testFile}`)
    process.exit(result.status ?? 1)
  }
}

console.log(`Frontend contract tests passed: ${testFiles.length} files.`)
