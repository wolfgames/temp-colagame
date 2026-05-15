/**
 * Query the semantic router index from the command line.
 *
 * Usage: npx tsx scripts/query-index.ts "review the sprite button"
 *        npx tsx scripts/query-index.ts "how do assets load" --type doc
 *        npx tsx scripts/query-index.ts "commit" --type command
 *        npx tsx scripts/query-index.ts "puzzle solver" --type citylines-core
 *        npx tsx scripts/query-index.ts "viewport config" --type scaffold-config
 *        npx tsx scripts/query-index.ts "swipe detection" --type dispatch-core
 *
 * Types: rule, doc, command,
 *        scaffold-system, scaffold-ui, scaffold-config, scaffold-dev, scaffold-lib, scaffold-util,
 *        game-screen, game-component, game-controller, game-audio, game-service, game-config,
 *        game-type, game-tuning, game-hook, game-analytics,
 *        citylines-core, citylines-ui, citylines-data, citylines-type, citylines-service,
 *        citylines-animation, citylines-system, citylines-controller, citylines-screen, citylines-util,
 *        dispatch-core, dispatch-ui, dispatch-data, dispatch-type, dispatch-service,
 *        dispatch-animation, dispatch-system, dispatch-controller, dispatch-screen, dispatch-util,
 *        tuning, level
 */
import { SemanticRouter, createOramaEmbedFn } from '@wolfgames/semantic-router'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const INDEX_PATH = join(import.meta.dirname, 'router-index.json')

async function query() {
  const args = process.argv.slice(2)
  const typeIdx = args.indexOf('--type')
  const typeEqFlag = args.find((a) => a.startsWith('--type='))
  const typeFlag = typeEqFlag?.split('=')[1]
    ?? (typeIdx !== -1 ? args[typeIdx + 1] : undefined)

  // Remove --type and its value from text args
  const skipIdxs = new Set<number>()
  if (typeEqFlag) skipIdxs.add(args.indexOf(typeEqFlag))
  if (typeIdx !== -1) { skipIdxs.add(typeIdx); skipIdxs.add(typeIdx + 1) }
  const text = args.filter((_, i) => !skipIdxs.has(i) && !args[i].startsWith('--')).join(' ')

  if (!text) {
    console.log('Usage: npx tsx scripts/query-index.ts "your query" [--type <type>]')
    console.log('       Use partial type prefixes: scaffold-*, game-*, citylines-*, dispatch-*')
    process.exit(1)
  }

  const embedFn = await createOramaEmbedFn()
  const router = new SemanticRouter(embedFn)
  await router.init()

  const data = JSON.parse(await readFile(INDEX_PATH, 'utf-8'))
  await router.deserialize(data)

  const results = await router.query(text, {
    type: typeFlag,
    limit: 10,
  })

  console.log(`\nResults for: "${text}"${typeFlag ? ` (type: ${typeFlag})` : ''}\n`)

  for (const { route, score } of results) {
    const scoreStr = score.toFixed(4).padStart(8)
    const typeStr = route.type.padEnd(22)
    console.log(`  ${scoreStr}  [${typeStr}]  ${route.name}`)
    console.log(`             ${route.path}`)
    if (route.description) {
      console.log(`             ${route.description.slice(0, 80)}`)
    }
    console.log()
  }
}

query().catch(console.error)
