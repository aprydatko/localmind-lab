import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { RagService } from '../src/services/rag-service.js'

test('RagService initializes, chunks, and searches correctly', () => {
  const testDir = fileURLToPath(new URL('./temp-docs', import.meta.url))
  
  // Create temp dir and file
  mkdirSync(testDir, { recursive: true })
  writeFileSync(join(testDir, 'test-doc.md'), 'The quick brown fox jumps over the lazy dog. \n\n This is a second paragraph about a completely different topic like quantum computing.')

  const service = new RagService(testDir)
  
  // Search for the fox
  const foxResults = service.search('brown fox', 2)
  assert.equal(foxResults.length, 1)
  assert.match(foxResults[0].content, /quick brown fox/)

  // Search for quantum
  const quantumResults = service.search('quantum computing', 2)
  assert.equal(quantumResults.length, 1)
  assert.match(quantumResults[0].content, /completely different topic/)

  // Clean up
  rmSync(testDir, { recursive: true, force: true })
})
