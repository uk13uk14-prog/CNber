#!/usr/bin/env node
/**
 * M1 专用：修复 ready_to_start 且无司机的异常订单 — 仅 dry-run，不写入数据库。
 *
 * 用法：
 *   node scripts/fix_ready_to_start_without_driver_dryrun.js
 *   DRY_RUN=0 node scripts/fix_ready_to_start_without_driver_dryrun.js  # 仍不会写入（本脚本无写入逻辑）
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

function buildSuggestedPatch(order) {
  const { statusReason, paymentNote, update, afterPreview } = buildApplyUpdate(order)
  return {
    statusReason,
    paymentNote,
    patch: {
      status: afterPreview.status,
      paymentStatus: afterPreview.paymentStatus,
      dispatchStatus: afterPreview.dispatchStatus,
      _unchanged: [
        'paidAmount',
        'depositAmount',
        'balanceAmount',
        'totalAmount',
        'depositPaid',
        'remainingPaid',
        'depositStatus',
        'balanceStatus',
        'paymentStage',
        'payment',
        'depositPaymentInfo',
        'balancePaymentInfo',
        'userId',
        'pickup',
        'destination',
        'amount'
      ],
      $push: update.$push
    }
  }
}

;(async () => {
  const mongoUrl =
    process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cnber'
  await mongoose.connect(mongoUrl)

  console.log('=== fix_ready_to_start_without_driver DRY-RUN ===')
  console.log('模式: 只读，不写入\n')
  console.log('目标 orderNo:', TARGET_ORDER_NOS.join(', '))
  console.log('匹配条件:', JSON.stringify(MATCH), '\n')

  let matched = 0
  let skipped = 0

  for (const orderNo of TARGET_ORDER_NOS) {
    const order = await Order.findOne({ orderNo }).lean()
    console.log('='.repeat(60))
    console.log(`订单: ${orderNo}`)

    if (!order) {
      console.log('  结果: 未找到')
      skipped += 1
      continue
    }

    console.log('\n【当前状态】')
    console.log(JSON.stringify(summarize(order), null, 2))

    if (!matchesTarget(order)) {
      console.log('\n【跳过】不满足修复条件（可能已修复或字段已变化）')
      console.log(
        '  需要: status=ready_to_start, driverId=null, assignedDriver=null, dispatchStatus=pending'
      )
      skipped += 1
      continue
    }

    matched += 1
    const { statusReason, paymentNote, patch } = buildSuggestedPatch(order)

    console.log('\n【建议修复状态】')
    console.log(
      JSON.stringify(
        {
          status: patch.status,
          paymentStatus: patch.paymentStatus,
          dispatchStatus: patch.dispatchStatus,
          operationLog: patch.$push.operationLogs
        },
        null,
        2
      )
    )

    console.log('\n【修复原因】')
    console.log(`  1. ${statusReason}`)
    console.log(`  2. paymentStatus: ${paymentNote}`)
    console.log(
      '  3. 由 POST /api/order/pay (paymentType=remaining|full) 在未派单/定金未确认时写入 ready_to_start'
    )
    console.log('  4. 不删除支付记录、不清空金额、不改客户信息')
    console.log('\n【将写入的 $set / $push（dry-run 预览）】')
    console.log(JSON.stringify({ $set: { status: patch.status, paymentStatus: patch.paymentStatus, dispatchStatus: patch.dispatchStatus }, $push: patch.$push }, null, 2))
  }

  console.log('\n' + '='.repeat(60))
  console.log(`汇总: 匹配 ${matched} 单，跳过/未找到 ${skipped} 单`)
  console.log('本脚本未执行任何 MongoDB 写入。')
  console.log('确认后请另建 apply 脚本或手动执行 update。')

  await mongoose.disconnect()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
