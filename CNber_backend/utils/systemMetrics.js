const os = require('os')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** @returns {{ memoryPressureFreePercent: number, memoryPercent: number } | null} */
function parseMemoryPressureOutput(stdout) {
  const text = String(stdout || '')
  const match = text.match(/System-wide memory free percentage:\s*(\d+(?:\.\d+)?)\s*%/i)
  if (!match) return null
  const freePercent = Number(match[1])
  if (!Number.isFinite(freePercent)) return null
  const memoryPressureFreePercent = Math.round(freePercent)
  const memoryPercent = Math.max(0, Math.min(100, 100 - memoryPressureFreePercent))
  return { memoryPressureFreePercent, memoryPercent }
}

async function getDarwinMemoryFromPressure() {
  try {
    const { stdout } = await execFileAsync('memory_pressure', [], { timeout: 3000 })
    return parseMemoryPressureOutput(stdout)
  } catch {
    return null
  }
}

function getOsMemoryStats() {
  const totalBytes = os.totalmem()
  const freeBytes = os.freemem()
  const usedBytes = totalBytes - freeBytes
  const memoryTotalMB = Math.round(totalBytes / 1024 / 1024)
  const memoryUsedMB = Math.round(usedBytes / 1024 / 1024)
  const memoryPercent =
    memoryTotalMB > 0 ? Math.round((memoryUsedMB / memoryTotalMB) * 100) : 0
  return { memoryTotalMB, memoryUsedMB, memoryPercent }
}

async function collectMemoryStats() {
  const { memoryTotalMB, memoryUsedMB, memoryPercent: osPercent } = getOsMemoryStats()

  if (os.platform() === 'darwin') {
    const pressure = await getDarwinMemoryFromPressure()
    if (pressure) {
      const memoryUsedFromPressure = Math.round((memoryTotalMB * pressure.memoryPercent) / 100)
      return {
        memoryTotalMB,
        memoryUsedMB: memoryUsedFromPressure,
        memoryPercent: pressure.memoryPercent,
        memoryPressureFreePercent: pressure.memoryPressureFreePercent,
        memorySource: 'memory_pressure'
      }
    }
  }

  return {
    memoryTotalMB,
    memoryUsedMB,
    memoryPercent: osPercent,
    memoryPressureFreePercent: null,
    memorySource: 'os'
  }
}

function sampleCpuUsagePercent(delayMs = 100) {
  return new Promise((resolve) => {
    const cpus1 = os.cpus()
    setTimeout(() => {
      const cpus2 = os.cpus()
      let idleDiff = 0
      let totalDiff = 0
      for (let i = 0; i < cpus1.length; i++) {
        const t1 = cpus1[i].times
        const t2 = cpus2[i].times
        const idle = t2.idle - t1.idle
        const total =
          t2.user -
          t1.user +
          (t2.nice - t1.nice) +
          (t2.sys - t1.sys) +
          (t2.idle - t1.idle) +
          (t2.irq - t1.irq)
        idleDiff += idle
        totalDiff += total
      }
      if (totalDiff <= 0) {
        resolve(0)
        return
      }
      const pct = Math.round(100 * (1 - idleDiff / totalDiff))
      resolve(Math.max(0, Math.min(100, pct)))
    }, delayMs)
  })
}

async function collectSystemHealth() {
  const memory = await collectMemoryStats()
  const cpuUsage = await sampleCpuUsagePercent()
  const nodeMajor = process.versions.node.split('.')[0]

  return {
    cpuUsage,
    memoryUsedMB: memory.memoryUsedMB,
    memoryTotalMB: memory.memoryTotalMB,
    memoryPercent: memory.memoryPercent,
    memoryPressureFreePercent: memory.memoryPressureFreePercent,
    memorySource: memory.memorySource,
    uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10,
    nodeVersion: `v${nodeMajor}`,
    platform: os.platform()
  }
}

module.exports = {
  startOfToday,
  collectSystemHealth,
  parseMemoryPressureOutput,
  getOsMemoryStats,
  collectMemoryStats
}
