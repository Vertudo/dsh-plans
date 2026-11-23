import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractPlans, outcomeOf, planAddress, planOf } from '../src/plans/log.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(join(here, 'fixtures/backend-docs-session.json'), 'utf8'))

test('reads the four plans of a real Session, newest first', () => {
  const plans = extractPlans(fixture.records)
  assert.equal(plans.length, 4)
  assert.deepEqual(plans.map((plan) => plan.n), [4, 3, 2, 1])
  assert.deepEqual(plans.map((plan) => plan.seq), [346, 258, 231, 210])
})

test('takes the title from the markdown heading and status from the result', () => {
  const plans = extractPlans(fixture.records)
  const newest = plans[0]
  assert.equal(newest.status, 'approved')
  assert.equal(newest.source, 'dsh')
  assert.ok(newest.title.length > 0)
  assert.equal(newest.markdown.split('\n')[0].replace(/^#\s+/, '').trim(), newest.title)
  assert.deepEqual(plans.slice(1).map((plan) => plan.status), ['dismissed', 'dismissed', 'dismissed'])
})

test('ignores every event that is not a plan submission', () => {
  assert.equal(planOf({ type: 'tool/call', data: { name: 'bash', callId: 'c1', arguments: '{}' } }), undefined)
  assert.equal(planOf({ type: 'tool/call', data: { name: 'exit_plan_mode', callId: 'c1', arguments: 'not json' } }), undefined)
  assert.equal(planOf({ type: 'tool/call', data: { name: 'exit_plan_mode', callId: 'c1', arguments: '{"plan":5}' } }), undefined)
  assert.equal(planOf({ type: 'assistant/message', data: {} }), undefined)
  assert.equal(outcomeOf({ type: 'tool/result', data: { message: { content: [] } } }), undefined)
})

test('reads the PTC dispatch form and the imported Claude tool name', () => {
  const ptc = { type: 'tool/ptc-dispatch', seq: 5, time: 1, data: { name: 'exit_plan_mode', subCallId: 'sub-1', arguments: { plan: '# Plan from PTC\nbody' } } }
  const plan = planOf(ptc)
  assert.equal(plan.callId, 'sub-1')
  assert.equal(plan.title, 'Plan from PTC')
  assert.equal(plan.source, 'dsh')

  const claude = { type: 'tool/call', seq: 6, time: 2, data: { name: 'ExitPlanMode', callId: 'call-2', arguments: JSON.stringify({ plan: '# Импортированный план\nтекст' }) } }
  const imported = planOf(claude)
  assert.equal(imported.source, 'claude')
  assert.equal(imported.title, 'Импортированный план')
})

test('keeps plans without a heading, and marks unknown outcomes', () => {
  const events = [{ type: 'tool/call', seq: 1, time: 1, data: { name: 'exit_plan_mode', callId: 'c1', arguments: '{"plan":"no heading here"}' } }]
  const plans = extractPlans(events)
  assert.equal(plans.length, 1)
  assert.equal(plans[0].title, undefined)
  assert.equal(plans[0].status, 'unknown')
})

test('maps a failed review to revise and keeps the feedback', () => {
  const events = [
    { type: 'tool/call', seq: 1, time: 1, data: { name: 'exit_plan_mode', callId: 'c1', arguments: '{"plan":"# Plan"}' } },
    { type: 'tool/result', seq: 2, data: { message: { source: { kind: 'tool', callId: 'c1' }, isError: true, content: [{ type: 'text', text: 'Keep planning: add the rollback steps.' }] } } },
  ]
  const [plan] = extractPlans(events)
  assert.equal(plan.status, 'revise')
  assert.match(plan.feedback, /rollback/)
})

test('builds the resource address the built-in plan tab claims', () => {
  assert.equal(planAddress('session-1', 'call-2'), 'dsh-resource://plan/session-1/call-2')
  assert.equal(planAddress('a/b', 'c d'), 'dsh-resource://plan/a%2Fb/c%20d')
})
