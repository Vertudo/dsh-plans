/** Repository hygiene: UTF-8 without BOM, LF endings, no tabs, one trailing newline. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const skip = new Set(['node_modules', '.git', 'lib'])
const problems = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      walk(path)
      continue
    }
    if (!/\.(js|mjs|json|md|yml|yaml|svg|txt)$/.test(name)) continue
    const buffer = readFileSync(path)
    const shown = relative(root, path)
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) problems.push(`${shown}: BOM`)
    const text = buffer.toString('utf8')
    if (text.includes('\r\n')) problems.push(`${shown}: CRLF`)
    if (text.includes('\t')) problems.push(`${shown}: tab character`)
    if (text.length > 0 && !text.endsWith('\n')) problems.push(`${shown}: no trailing newline`)
    if (text.endsWith('\n\n')) problems.push(`${shown}: blank line at end`)
  }
}

walk(root)
if (problems.length > 0) {
  for (const problem of problems) console.error(problem)
  process.exit(1)
}
console.log('sources are clean')
