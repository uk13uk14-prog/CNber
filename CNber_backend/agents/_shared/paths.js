const fs = require('fs')
const path = require('path')

const BACKEND_ROOT = path.join(__dirname, '..', '..')
const REPORTS_DIR = path.join(BACKEND_ROOT, 'runtime', 'reports')

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
  return REPORTS_DIR
}

function reportPath(basename) {
  ensureReportsDir()
  return path.join(REPORTS_DIR, basename)
}

module.exports = {
  BACKEND_ROOT,
  REPORTS_DIR,
  ensureReportsDir,
  reportPath
}
