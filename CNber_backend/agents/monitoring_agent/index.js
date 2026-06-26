#!/usr/bin/env node
/**
 * CNber Monitoring Agent — 系统健康监控（只读）
 */
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { collectSystemHealth } = require('../../utils/systemMetrics')
const { getQueueStats } = require('../../services/jobQueueService')
const { httpGet } = require('../_shared/httpClient')
const { diskSummary } = require('../_shared/diskStats')
const { writeAgentReports } = require('../_shared/reportWriter')
const { BACKEND_ROOT } = require('../_shared/paths')

const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnber'
const LOGS_DIR = path.join(BACKEND_ROOT, 'logs')
const LOG_SCAN_LINES = Number(process.env.MONITOR_LOG_LINES || 500)
const MEM_WARN = Number(process.env.MONITOR_MEM_WARN || 85)
const CPU_WARN = Number(process.env.MONITOR_CPU_WARN || 85)
const DISK_WARN = Number(process.env.MONITOR_DISK_WARN || 90)

const report = {
  agent: 'monitoring_agent',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  verdict: 'PENDING',
  result: 'PENDING',
  checks: {},
  logs: { errors: [], warnings: [] },
  issues: []
}

function addIssue(level, message) {
  report.issues.push({ level, message, at: new Date().toISOString() })
}

function tailFile(filePath, maxLines) {
  if (!fs.existsSync(filePath)) return []
  const content = fs.readFileSync(filePath, 'utf8')
  return content.split('\n').filter(Boolean).slice(-maxLines)
}

function scanLogs() {
  const files = ['app.log', 'error.log']
  const errors = []
  const warnings = []

  for (const name of files) {
    const lines = tailFile(path.join(LOGS_DIR, name), LOG_SCAN_LINES)
    for (const line of lines) {
      if (/\[error\]/i.test(line)) errors.push({ file: name, line: line.slice(0, 500) })
      else if (/\[warn\]/i.test(line)) warnings.push({ file: name, line: line.slice(0, 500) })
    }
  }

  report.logs = {
    errors: errors.slice(-20),
    warnings: warnings.slice(-20),
    errorCount: errors.length,
    warningCount: warnings.length
  }

  if (errors.length > 0) {
    addIssue('warn', `日志中发现 ${errors.length} 条 ERROR（最近 ${LOG_SCAN_LINES} 行）`)
  }
  if (warnings.length > 5) {
    addIssue('warn', `日志中发现 ${warnings.length} 条 WARN`)
  }
}

async function checkBackend() {
  const r = await httpGet('/api/status')
  const ok = r.status === 200 && r.json?.code === 0 && r.json?.data?.ok
  report.checks.backend = { ok, httpStatus: r.status }
  if (!ok) addIssue('error', 'Backend /api/status 异常')
  return ok
}

async function checkMongo() {
  const state = mongoose.connection.readyState
  const ok = state === 1
  let pingMs = null
  if (ok) {
    const t0 = Date.now()
    await mongoose.connection.db.admin().ping()
    pingMs = Date.now() - t0
  }
  report.checks.mongo = { ok, state, pingMs }
  if (!ok) addIssue('error', 'MongoDB 未连接')
  return ok
}

async function checkJobWorker() {
  const stats = await getQueueStats()
  const workerLogHint = tailFile(path.join(LOGS_DIR, 'app.log'), 200).some((l) =>
    l.includes('[jobWorker]')
  )

  const ok = stats.failed < 10
  report.checks.jobWorker = {
    ok,
    queue: stats,
    recentWorkerLog: workerLogHint,
    note: workerLogHint
      ? '日志中有 jobWorker 活动记录'
      : '未在近期日志中发现 jobWorker（可能未启动或日志轮转）'
  }

  if (stats.failed >= 10) {
    addIssue('warn', `Job Queue 失败任务过多: ${stats.failed}`)
  }
  if (!workerLogHint && stats.pending > 0) {
    addIssue('warn', '有待处理 Job 但未见 Worker 日志活动')
  }
  return ok
}

async function checkResources() {
  const system = await collectSystemHealth()
  const disk = diskSummary()

  report.checks.resources = {
    memoryPercent: system.memoryPercent,
    memoryUsedMB: system.memoryUsedMB,
    memoryTotalMB: system.memoryTotalMB,
    cpuUsage: system.cpuUsage,
    diskUsagePercent: disk.usagePercent,
    uptimeHours: system.uptimeHours,
    platform: system.platform
  }

  if (system.memoryPercent >= MEM_WARN) {
    addIssue('warn', `内存使用率 ${system.memoryPercent}% >= ${MEM_WARN}%`)
  }
  if (system.cpuUsage >= CPU_WARN) {
    addIssue('warn', `CPU 使用率 ${system.cpuUsage}% >= ${CPU_WARN}%`)
  }
  if (disk.usagePercent != null && disk.usagePercent >= DISK_WARN) {
    addIssue('warn', `磁盘使用率 ${disk.usagePercent}% >= ${DISK_WARN}%`)
  }

  return (
    system.memoryPercent < MEM_WARN &&
    system.cpuUsage < CPU_WARN &&
    (disk.usagePercent == null || disk.usagePercent < DISK_WARN)
  )
}

function buildMarkdown() {
  const lines = [
    '# CNber Monitoring Agent 报告',
    '',
    `## ${report.verdict}`,
    '',
    `**结果**: ${report.result}`,
    `**开始**: ${report.startedAt}`,
    `**结束**: ${report.finishedAt}`,
    '',
    '## 检查项',
    '',
    `- Backend: ${report.checks.backend?.ok ? 'OK' : 'FAIL'}`,
    `- MongoDB: ${report.checks.mongo?.ok ? 'OK' : 'FAIL'} (ping ${report.checks.mongo?.pingMs ?? '—'}ms)`,
    `- Job Worker: ${report.checks.jobWorker?.ok ? 'OK' : 'WARN'}`,
    `- Memory: ${report.checks.resources?.memoryPercent ?? '—'}%`,
    `- CPU: ${report.checks.resources?.cpuUsage ?? '—'}%`,
    `- Disk: ${report.checks.resources?.diskUsagePercent ?? '—'}%`,
    '',
    '## 日志',
    '',
    `- ERROR (recent): ${report.logs.errorCount ?? 0}`,
    `- WARN (recent): ${report.logs.warningCount ?? 0}`,
    ''
  ]

  if (report.issues.length) {
    lines.push('## 问题', '')
    for (const i of report.issues) {
      lines.push(`- [${i.level}] ${i.message}`)
    }
    lines.push('')
  }

  return lines
}

async function main() {
  console.log('\n=== CNber Monitoring Agent ===\n')

  scanLogs()
  await mongoose.connect(mongoUrl)

  await checkBackend()
  await checkMongo()
  await checkJobWorker()
  await checkResources()

  const hasError = report.issues.some((i) => i.level === 'error')
  const hasWarn = report.issues.length > 0

  report.verdict = hasError || hasWarn ? 'System Warning' : 'System Healthy'
  report.result = hasError ? 'FAIL' : hasWarn ? 'WARN' : 'PASS'
  report.finishedAt = new Date().toISOString()

  const { jsonPath, mdPath } = writeAgentReports('monitoring_report', report, buildMarkdown())

  console.log(report.verdict)
  console.log(`Backend: ${report.checks.backend?.ok ? 'ok' : 'fail'}`)
  console.log(`Mongo: ${report.checks.mongo?.ok ? 'ok' : 'fail'}`)
  console.log(`Memory: ${report.checks.resources?.memoryPercent}% | CPU: ${report.checks.resources?.cpuUsage}%`)
  console.log(`\nJSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
  console.log(`\n>>> ${report.result}\n`)

  await mongoose.disconnect()
  if (hasError) process.exit(1)
}

main().catch(async (err) => {
  report.verdict = 'System Warning'
  report.result = 'FAIL'
  report.finishedAt = new Date().toISOString()
  report.failure = err.message
  try {
    writeAgentReports('monitoring_report', report, [
      '# CNber Monitoring Agent 报告',
      '',
      '## System Warning',
      '',
      `**错误**: ${err.message}`
    ])
  } catch {
    /* ignore */
  }
  console.log('System Warning')
  console.error(`\n❌ Monitoring Agent 失败: ${err.message}\n`)
  if (mongoose.connection.readyState === 1) await mongoose.disconnect()
  process.exit(1)
})
