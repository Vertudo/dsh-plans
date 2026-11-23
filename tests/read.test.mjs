import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSessionPlans } from '../src/client/read.js'

function event(seq, tool, callId, plan) {
  return {
    seq,
    event: { type: 'tool/call', seq, time: seq, data: { name: tool, callId, arguments: JSON.stringify({ plan }) } },
  }
}

function result(seq, callId) {
  return {
    seq,
    event: {
      type: 'tool/result',
      seq,
      data: { message: { source: { kind: 'tool', callId }, isError: false, content: [{ type: 'text', text: 'Plan approved — plan mode exited.' }] } },
    },
  }
}

test('walks every page of the Session log and returns plans newest first', async () => {
  const newest = [event(30, 'exit_plan_mode', 'c3', '# Third\nx'), result(31, 'c3')]
  const older = [event(10, 'exit_plan_mode', 'c1', '# First\nx'), result(11, 'c1'), event(20, 'exit_plan_mode', 'c2', '# Second\nx')]
  const calls = []
  const remote = {
    async events(request, signal) {
      calls.push(['events', request])
      assert.equal(request.address.kind, 'session')
      return { ok: true, value: { cursor: 30, hasMore: true, records: newest } }
    },
    async page(request, signal) {
      calls.push(['page', request])
      return { ok: true, value: { hasMore: false, records: older } }
    },
  }

  const plans = await readSessionPlans(remote, 'session-1', new AbortController().signal)
  assert.deepEqual(plans.map((plan) => plan.title), ['Third', 'Second', 'First'])
  assert.deepEqual(plans.map((plan) => plan.n), [3, 2, 1])
  assert.equal(plans[0].status, 'approved')
  assert.equal(calls.length, 2)
  assert.equal(calls[1][1].throughSeq, 30)
  assert.equal(calls[1][1].beforeSeq, 30)
})

test('stops at the first page when there is no more history', async () => {
  const remote = {
    async events() {
      return { ok: true, value: { cursor: 5, hasMore: false, records: [event(1, 'exit_plan_mode', 'c1', '# Only')] } }
    },
    async page() {
      throw new Error('page must not be called')
    },
  }
  const plans = await readSessionPlans(remote, 'session-1', new AbortController().signal)
  assert.equal(plans.length, 1)
})

test('surfaces a failed read instead of an empty list', async () => {
  const remote = { async events() { return { ok: false, error: { message: 'session is gone' } } } }
  await assert.rejects(() => readSessionPlans(remote, 'session-1', new AbortController().signal), /session is gone/)
})
