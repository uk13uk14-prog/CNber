const os = require('os')
const { execSync } = require('child_process')

function estimateDiskUsagePercent() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /value', {
        encoding: 'utf8',
        timeout: 5000
      })
      const free = Number((out.match(/FreeSpace=(\d+)/) || [])[1] || 0)
      const size = Number((out.match(/Size=(\d+)/) || [])[1] || 0)
      if (size > 0) return Math.round(((size - free) / size) * 100)
    } else {
      const line = execSync('df -k / | tail -1', { encoding: 'utf8', timeout: 5000 }).trim()
      const parts = line.split(/\s+/)
      const used = parts[4]
      if (used && used.endsWith('%')) return Number(used.replace('%', ''))
    }
  } catch {
    /* ignore */
  }
  return null
}

function diskSummary() {
  const usagePercent = estimateDiskUsagePercent()
  return {
    usagePercent,
    platform: os.platform(),
    ok: usagePercent == null || usagePercent < 90
  }
}

module.exports = { estimateDiskUsagePercent, diskSummary }
