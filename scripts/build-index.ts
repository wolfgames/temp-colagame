/**
 * Builds a semantic router index from the entire project,
 * categorized by architectural role for precise querying.
 * Serializes to scripts/router-index.json for fast loading.
 *
 * Usage: npx tsx scripts/build-index.ts
 */
import { SemanticRouter, indexFiles, createOramaEmbedFn } from '@wolfgames/semantic-router'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const OUTPUT = join(ROOT, 'scripts', 'router-index.json')

/** Each source maps a type label to a directory + extensions. */
const sources = [
  // --- Documentation & Rules ---
  { type: 'rule', path: 'ai/rules', ext: ['.mdc', '.md'] },
  { type: 'doc', path: 'docs', ext: ['.md'] },
  { type: 'command', path: 'docs/factory', ext: ['.md'] },

  // --- Core (amino-owned framework) ---
  { type: 'core-system', path: 'src/core/systems', ext: ['.ts', '.tsx'] },
  { type: 'core-ui', path: 'src/core/ui', ext: ['.ts', '.tsx'] },
  { type: 'core-config', path: 'src/core/config', ext: ['.ts'] },
  { type: 'core-dev', path: 'src/core/dev', ext: ['.ts', '.tsx'] },
  { type: 'core-lib', path: 'src/core/lib', ext: ['.ts'] },
  { type: 'core-util', path: 'src/core/utils', ext: ['.ts', '.tsx'] },
  { type: 'core-analytics', path: 'src/core/analytics', ext: ['.ts'] },

  // --- Modules (shared reusable modules) ---
  { type: 'module-logic', path: 'src/modules/logic', ext: ['.ts'] },
  { type: 'module-prefab', path: 'src/modules/prefabs', ext: ['.ts', '.tsx'] },
  { type: 'module-primitive', path: 'src/modules/primitives', ext: ['.ts', '.tsx'] },

  // --- Game ---
  { type: 'game-screen', path: 'src/game/screens', ext: ['.ts', '.tsx'] },
  { type: 'game-audio', path: 'src/game/audio', ext: ['.ts'] },
  { type: 'game-tuning', path: 'src/game/tuning', ext: ['.ts'] },
  { type: 'game-setup', path: 'src/game/setup', ext: ['.ts'] },
  { type: 'game-variant', path: 'src/game/mygame', ext: ['.ts', '.tsx'] },

  // --- Public data ---
  { type: 'tuning', path: 'public/config/tuning', ext: ['.json'] },
  { type: 'level', path: 'public/chapters', ext: ['.json'] },
] as const

async function build() {
  console.log('Loading embedding model...')
  const embedFn = await createOramaEmbedFn()
  const router = new SemanticRouter(embedFn)
  await router.init()

  const counts: Record<string, number> = {}
  let total = 0

  for (const { type, path, ext } of sources) {
    const files = await indexFiles(join(ROOT, path), {
      type,
      extensions: [...ext],
    })
    await router.addMany(files)
    counts[type] = files.length
    total += files.length
  }

  const data = await router.serialize()
  await writeFile(OUTPUT, JSON.stringify(data))

  console.log(`\nIndexed ${total} files across ${sources.length} categories:\n`)
  for (const [type, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${String(count).padStart(4)}  ${type}`)
  }
  console.log(`\nSaved to ${OUTPUT}`)
}

build().catch(console.error)
