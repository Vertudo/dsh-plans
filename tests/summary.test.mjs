import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  clockTime,
  countByStatus,
  dayLabel,
  filterOptions,
  filterPlans,
  fullTime,
  normaliseFilter,
  relativeKind,
  segments,
  timeLabel,
} from '../src/client/summary.js'

const NOW = new Date(2026, 10, 23, 12, 34).getTime()
const at = (dayOffset, hour = 9, minute = 0) => new Date(2026, 10, 23 + dayOffset, hour, minute).getTime()

const plans = [
  { callId: 'c5', n: 5, status: 'revise', time: at(0) },
  { callId: 'c4', n: 4, status: 'approved', time: at(0, 8) },
  { callId: 'c3', n: 3, status: 'approved', time: at(-1) },
  { callId: 'c2', n: 2, status: 'dismissed', time: at(-1, 8) },
  { callId: 'c1', n: 1, status: 'dismissed', time: at(-3) },
]

test('counts every row and folds an unfamiliar outcome into "unknown"', () => {
  assert.deepEqual(countByStatus(plans), { total: 5, approved: 2, revise: 1, dismissed: 2, unknown: 0 })
  assert.equal(countByStatus([...plans, { callId: 'x', status: 'weird' }]).unknown, 1)
  assert.equal(countByStatus(undefined).total, 0)
})

test('the composition keeps the fixed order and drops empty outcomes', () => {
  assert.deepEqual(segments(countByStatus(plans)), [
    { status: 'approved', count: 2 },
    { status: 'revise', count: 1 },
    { status: 'dismissed', count: 2 },
  ])
  assert.deepEqual(segments(countByStatus([{ status: 'revise' }])), [{ status: 'revise', count: 1 }])
  assert.deepEqual(segments(countByStatus([])), [])
})

test('the chips are "all" plus every outcome that occurs', () => {
  assert.deepEqual(filterOptions(plans), [
    { id: 'all', count: 5 },
    { id: 'approved', count: 2 },
    { id: 'revise', count: 1 },
    { id: 'dismissed', count: 2 },
  ])
})

test('filtering keeps the order of the list it was given', () => {
  assert.deepEqual(filterPlans(plans, 'all').map((plan) => plan.n), [5, 4, 3, 2, 1])
  assert.deepEqual(filterPlans(plans, 'approved').map((plan) => plan.n), [4, 3])
  assert.deepEqual(filterPlans(plans, 'unknown'), [])
  assert.deepEqual(filterPlans(undefined, 'approved'), [])
})

test('a filter that disappeared falls back to "all"', () => {
  const options = filterOptions(plans)
  assert.equal(normaliseFilter('revise', options), 'revise')
  assert.equal(normaliseFilter('unknown', options), 'all')
  assert.equal(normaliseFilter(null, options), 'all')
})

test('the time kind follows the day, then the year', () => {
  assert.equal(relativeKind(NOW, NOW), 'today')
  assert.equal(relativeKind(at(-1, 23, 59), NOW), 'yesterday')
  assert.equal(relativeKind(at(-2), NOW), 'year')
  assert.equal(relativeKind(new Date(2025, 10, 20).getTime(), NOW), 'older')
  assert.equal(relativeKind(undefined, NOW), 'unknown')
  assert.equal(relativeKind(at(1), NOW), 'today', 'a clock ahead of now still reads as today')
})

test('the clock is zero-padded', () => {
  assert.equal(clockTime(at(0, 7, 5)), '07:05')
})

test('a row reads a clock today, a prefixed clock yesterday, a date beyond', () => {
  const labels = { today: 'сегодня', yesterday: 'вчера' }
  assert.equal(timeLabel(NOW, NOW, 'ru-RU', 'вчера, {time}'), clockTime(NOW))
  assert.equal(timeLabel(at(-1, 18, 12), NOW, 'ru-RU', 'вчера, {time}'), 'вчера, 18:12')
  const older = timeLabel(at(-3), NOW, 'ru-RU', 'вчера, {time}')
  assert.notEqual(older, '')
  assert.ok(!older.includes(':'), 'a date beyond yesterday carries no clock')
  assert.equal(timeLabel(undefined, NOW, 'ru-RU', '{time}'), '')
})

test('the Session card folds a day into a word when it is close', () => {
  const labels = { today: 'сегодня', yesterday: 'вчера' }
  assert.equal(dayLabel(NOW, NOW, 'ru-RU', labels), 'сегодня')
  assert.equal(dayLabel(at(-1), NOW, 'ru-RU', labels), 'вчера')
  assert.notEqual(dayLabel(at(-9), NOW, 'ru-RU', labels), '')
  assert.equal(dayLabel(undefined, NOW, 'ru-RU', {}), '')
})

test('a full timestamp is empty when the time is absent', () => {
  assert.equal(fullTime(undefined, 'ru-RU'), '')
  assert.notEqual(fullTime(NOW, 'ru-RU'), '')
})
