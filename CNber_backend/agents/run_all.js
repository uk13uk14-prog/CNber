#!/usr/bin/env node
/**
 * CNber Agent 编排 — 依次执行 QA → Operations → Monitoring → Mobile
 */
require('dotenv').config()

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { ensureReportsDir, BACKEND_ROOT } = require('./_shared/paths')
const { writeJsonReport, writeMarkdownReport } = require('./_shared/reportWriter')

const AGENTS = [
  { key: 'qa', name: 'QA Demo Agent', script: 'agents/qa_demo_agent/index.js', required: true },
  { key: 'ops', name: 'Operations Agent', script: 'agents/operations_agent/index.js', required: true },
  {
    key: 'monitor',
    name: 'Monitoring Agent',
    script: 'agents/monitoring_agent/index.js',
    required: true
  },
  {
    key: 'mobile',
    name: 'Mobile Demo Agent',
    script: 'agents/mobile_demo_agent/index.js',
    required: false
  }
]

const summary = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  result: 'PENDING',
  agents: []
}

function readAgentReport(baseName) {
  const p = path.join(ensureReportsDir(), `${baseName}.json`)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function runAgent(agent) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`▶ ${agent.name}`)
  console.log('='.repeat(60))

  const scriptPath = path.join(BACKEND_ROOT, agent.script)
  const started = Date.now()
  const proc = spawnSync(process.execPath, [scriptPath], {
    cwd: BACKEND_ROOT,
    stdio: 'inherit',
    env: process.env
  })
  const durationMs = Date.now() - started

  const reportMap = {
    qa: 'qa_demo_report',
    ops: 'operations_report',
    monitor: 'monitoring_report',
    mobile: 'mobile_demo_report'
  }
  const agentReport = readAgentReport(reportMap[agent.key])
  const result =
    agentReport?.result ||
    (proc.status === 0 ? 'PASS' : 'FAIL')

  const entry = {
    key: agent.key,
    name: agent.name,
    exitCode: proc.status,
    durationMs,
    result,
    skipped: agentReport?.skipped === true,
    verdict: agentReport?.verdict || null
  }
  summary.agents.push(entry)

  if (agent.required && proc.status !== 0) {
    return false
  }
  if (!agent.required && result === 'FAIL' && !agentReport?.skipped) {
    return false
  }
  return true
}

function buildSummaryMarkdown() {
  const lines = [
    '# CNber Agent Summary',
    '',
    `**结果**: ${summary.result}`,
    `**开始**: ${summary.startedAt}`,
    `**结束**: ${summary.finishedAt}`,
    '',
    '## 执行顺序',
    '',
    '| Agent | 结果 | 耗时 | 备注 |',
    '|-------|------|------|------|',
    ...summary.agents.map((a) => {
      const note = a.skipped ? 'Skipped (no device)' : a.verdict || ''
      return `| ${a.name} | ${a.result} | ${a.durationMs}ms | ${note} |`
    }),
    '',
    '## 报告文件',
    '',
    '- `runtime/reports/qa_demo_report.json`',
    '- `runtime/reports/operations_report.json`',
    '- `runtime/reports/monitoring_report.json`',
    '- `runtime/reports/mobile_demo_report.json`',
    ''
  ]
  return lines
}

async function main() {
  console.log('\n=== CNber Agent: All ===\n')
  ensureReportsDir()

  let ok = true
  for (const agent of AGENTS) {
    const passed = runAgent(agent)
    if (!passed) ok = false
  }

  summary.finishedAt = new Date().toISOString()
  summary.result = ok ? 'PASS' : 'FAIL'

  const jsonPath = path.join(ensureReportsDir(), 'agent_summary.json')
  const mdPath = path.join(ensureReportsDir(), 'agent_summary.md')
  writeJsonReport(jsonPath, summary)
  writeMarkdownReport(mdPath, buildSummaryMarkdown())

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Agent Summary: ${summary.result}`)
  console.log(`JSON: ${jsonPath}`)
  console.log(`Markdown: ${mdPath}`)
  console.log('='.repeat(60))

  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(`\n❌ agent:all 失败: ${err.message}\n`)
  process.exit(1)
})
