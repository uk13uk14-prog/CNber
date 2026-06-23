#!/usr/bin/env node
/**
 * M1 专用：修复 ready_to_start 且无司机的异常订单 — 默认 dry-run，APPLY=1 才写入。
 *
 * 用法：
 *   node scripts/fix_ready_to_start_without_driver_apply.js
 *   APPLY=1 node scripts/fix_ready_to_start_without_driver_apply.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Order = require('../models/Order')
const {
  TARGET_ORDER_NOS,
  MATCH,
  buildApplyUpdate,
  summarize,
  matchesTarget
} = require('./fix_ready_to_start_without_driver_lib')

const APPLY = process.env.APPLY === '1'

;(async () => {
  const mongoUrl =
    process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
  await mongoose.connect(mongoUrl)

  console.log('=== fix_ready_to_start_without_driver APPLY ===')
  console.log(`模式: ${APPLY ? '写入 (APPLY=1)' : '预览（未写入，需 APPLY=1）'}\n`)
  console.log('目标 orderNo:', TARGET_ORDER_NOS.join(', '))
  console.log('匹配条件:', JSON.stringify(MATCH), '\n')

  let matched = 0
  let applied = 0
  let skipped = 0

  for (const orderNo of TARGET_ORDER_NOS) {
    console.log('='.repeat(60))
    console.log(`订单: ${orderNo}`)

    const before = await Order.findOne({ orderNo }).lean()
    if (!before) {
      console.log('  结果: 未找到')
      skipped += 1
      continue
    }

    console.log('\n【BEFORE】')
    console.log(JSON.stringify(summarize(before), null, 2))

    if (!matchesTarget(before)) {
      console.log('\n【跳过】不满足修复条件')
      console.log(
        '  需要: status=ready_to_start, driverId=null, assignedDriver=null, dispatchStatus=pending'
      )
      skipped += 1
      continue
    }

    matched += 1
    const { statusReason, paymentNote, update, afterPreview } = buildApplyUpdate(before)

    console.log('\n【AFTER（计划）】')
    console.log(
      JSON.stringify(
        {
          ...afterPreview,
          operationLog: update.$push.operationLogs
        },
        null,
        2
      )
    )
    console.log('\n【原因】')
    console.log(`  - ${statusReason}`)
    console.log(`  - ${paymentNote}`)

    if (!APPLY) {
      console.log('\n【未写入】设置 APPLY=1 后重新运行以执行 update')
      continue
    }

    console.log('\n【执行写入】')
    const result = await Order.findOneAndUpdate(
      {
        orderNo,
        status: MATCH.status,
        driverId: null,
        assignedDriver: null,
        dispatchStatus: MATCH.dispatchStatus
      },
      update,
      { new: true }
    ).lean()

    if (!result) {
      console.log('  失败: 并发变更或条件不再匹配，未更新')
      skipped += 1
      continue
    }

    applied += 1
    console.log('\n【AFTER（已写入）】')
    console.log(JSON.stringify(summarize(result), null, 2))
    console.log(
      '  最近 operationLog:',
      JSON.stringify(result.operationLogs?.slice(-1)[0] || null, null, 2)
    )
  }

  console.log('\n' + '='.repeat(60))
  console.log(`汇总: 匹配 ${matched} 单，已写入 ${applied} 单，跳过/未找到 ${skipped} 单`)
  if (!APPLY) {
    console.log('当前为预览模式。执行: APPLY=1 node scripts/fix_ready_to_start_without_driver_apply.js')
  }

  await mongoose.disconnect()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
