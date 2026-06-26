const fs = require('fs')
const path = require('path')
const { ensureReportsDir } = require('./paths')

function writeJsonReport(filePath, data) {
  const dir = path.dirname(filePath)
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function writeMarkdownReport(filePath, lines) {
  const dir = path.dirname(filePath)
  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true })
  }
  const body = Array.isArray(lines) ? lines.filter((l) => l !== undefined).join('\n') : String(lines)
  fs.writeFileSync(filePath, body, 'utf8')
}

function writeAgentReports(baseName, report, markdownLines) {
  ensureReportsDir()
  const jsonPath = path.join(ensureReportsDir(), `${baseName}.json`)
  const mdPath = path.join(ensureReportsDir(), `${baseName}.md`)
  writeJsonReport(jsonPath, report)
  writeMarkdownReport(mdPath, markdownLines)
  return { jsonPath, mdPath }
}

module.exports = {
  writeJsonReport,
  writeMarkdownReport,
  writeAgentReports
}
