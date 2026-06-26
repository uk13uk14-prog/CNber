/**
 * 后台任务队列 smoke 测试
 *
 * 用法：npm run smoke:job-queue
 */
require('dotenv').config()

const assert = require('assert')
const mongoose = require('mongoose')
const Job = require('../models/Job')
const {
  enqueueJob,
  claimNextJob,
  markSuccess,
  markFailed,
  getQueueStats
} = require('../services/jobQueueService')
const { getHandler, listJobTypes } = require('../jobs/handlers')

const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/cnber'
const TAG = `SMOKE_JOB_QUEUE_${Date.now()}`

let failed = false

function step(name, ok, detail = '') {
  const mark = ok ? '✓' : '✗'
  console.log(`  ${mark} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed = true
}

async function runHandlerOnce(job) {
  const handler = getHandler(job.type)
  if (!handler) throw new Error(`no handler: ${job.type}`)
  await handler(job.payload || {})
  await markSuccess(job._id)
}

async function main() {
  console.log('\n=== CNber Job Queue Smoke ===\n')

  await mongoose.connect(mongoUrl)

  try {
    step('job types registered', listJobTypes().length === 4, listJobTypes().join(', '))

    const job = await enqueueJob('daily_report', { tag: TAG, note: 'smoke' })
    step('enqueueJob', job.status === 'pending' && job.type === 'daily_report', job._id.toString())

    const statsBefore = await getQueueStats()
    step('stats pending >= 1', statsBefore.pending >= 1, `pending=${statsBefore.pending}`)

    const claimed = await claimNextJob('smoke-worker')
    step('claimNextJob', claimed && claimed.status === 'running', claimed?._id?.toString())
    step('attempts incremented', claimed?.attempts === 1)

    await runHandlerOnce(claimed)
    const done = await Job.findById(claimed._id).lean()
    step('markSuccess via handler', done.status === 'success')

    const failJob = await enqueueJob('cleanup_logs', { tag: TAG }, { maxAttempts: 2 })
    const claimedFail = await claimNextJob('smoke-worker')
    await markFailed(claimedFail._id, 'smoke intentional failure')
    const retried = await Job.findById(failJob._id).lean()
    step('markFailed retry → pending', retried.status === 'pending' && retried.attempts === 1)

    const claimedFail2 = await claimNextJob('smoke-worker')
    step('re-claim after retry', !!claimedFail2)
    await markFailed(claimedFail2._id, 'smoke final failure')
    const finalFail = await Job.findById(failJob._id).lean()
    step('markFailed exhausted → failed', finalFail.status === 'failed')

    await Job.deleteMany({ 'payload.tag': TAG })

    console.log(failed ? '\n❌ Job queue smoke FAILED\n' : '\n✅ Job queue smoke PASSED\n')
    process.exit(failed ? 1 : 0)
  } catch (err) {
    console.error('\n❌ Job queue smoke error:', err.message)
    await Job.deleteMany({ 'payload.tag': TAG }).catch(() => {})
    process.exit(1)
  } finally {
    await mongoose.connection.close()
  }
}

main()
