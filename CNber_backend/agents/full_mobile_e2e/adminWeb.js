const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const { BACKEND_ROOT, ensureReportsDir } = require('../_shared/paths')

const ADMIN_WEB_ROOT = path.join(BACKEND_ROOT, '..', 'CNber_admin_web_v1.0')
const ADMIN_LOGIN_URL =
  process.env.E2E_ADMIN_WEB_URL || 'http://localhost:5173/admin/login'
const SCREENSHOT_DIR = path.join(ensureReportsDir(), 'full_mobile_e2e_screenshots')

async function resolveAdminLoginUrl() {
  if (process.env.E2E_ADMIN_WEB_URL) return process.env.E2E_ADMIN_WEB_URL
  for (const port of [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]) {
    const url = `http://localhost:${port}/admin/login`
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) })
      if (res.ok) return url
    } catch {
      /* try next */
    }
  }
  throw new Error('Admin Web 未在 5173–5180 端口找到 /admin/login')
}

let adminProc = null

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  return SCREENSHOT_DIR
}

async function dumpAdminPage(page, label) {
  await ensureScreenshotDir()
  const reportsDir = path.join(BACKEND_ROOT, 'runtime', 'reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  const png = path.join(reportsDir, `${label}.png`)
  const html = path.join(reportsDir, `${label}_dom.html`)
  await page.screenshot({ path: png, fullPage: true })
  const content = await page.content()
  fs.writeFileSync(html, content, 'utf8')
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, button, select, label')).map((el) => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder'),
      name: el.getAttribute('name'),
      text: (el.textContent || '').trim().slice(0, 80),
      aria: el.getAttribute('aria-label')
    }))
  )
  console.log(`  [admin:${label}] png=${png} dom=${html}`)
  console.log(
    `  [admin:${label}] controls: ${inputs
      .slice(0, 20)
      .map((i) => [i.tag, i.placeholder || i.text || i.type].filter(Boolean).join(':'))
      .join(' | ')}`
  )
  return { png, html, inputs }
}

async function resolveUsernameInput(page) {
  const candidates = [
    page.locator('input[autocomplete="username"]'),
    page.getByLabel(/手机号|Phone/i),
    page.locator('input[type="text"]').first(),
    page.locator('form input.input').first()
  ]
  for (const loc of candidates) {
    if (await loc.count()) return loc.first()
  }
  throw new Error('Admin 未找到用户名/手机号输入框')
}

async function resolvePasswordInput(page) {
  const candidates = [
    page.locator('input[type="password"]'),
    page.getByLabel(/密码|Password/i),
    page.locator('input[autocomplete="current-password"]')
  ]
  for (const loc of candidates) {
    if (await loc.count()) return loc.first()
  }
  throw new Error('Admin 未找到密码输入框')
}

async function resolveLoginButton(page) {
  const candidates = [
    page.getByRole('button', { name: /登录|Login|Sign in/i }),
    page.locator('button[type="submit"]'),
    page.locator('form button.btn-primary')
  ]
  for (const loc of candidates) {
    if (await loc.count()) return loc.first()
  }
  throw new Error('Admin 未找到登录按钮')
}

async function resolveOrderSearchInput(page) {
  await dumpAdminPage(page, 'admin_orders_dom')
  const candidates = [
    page.getByLabel(/客户手机|Customer phone|Phone/i),
    page.locator('input[placeholder="模糊"]'),
    page.locator('input[placeholder*="手机"]'),
    page.locator('input[placeholder*="phone" i]'),
    page.locator('input[placeholder*="模糊"]'),
    page.locator('.toolbar input.input').nth(1),
    page.locator('input.input').filter({ has: page.locator('xpath=..') })
  ]
  for (const loc of candidates) {
    try {
      if (await loc.count()) {
        const first = loc.first()
        if (await first.isVisible()) return first
      }
    } catch {
      /* try next */
    }
  }
  const byLabel = page.locator('label:has-text("客户手机") + input, label:has-text("客户手机") ~ input')
  if (await byLabel.count()) return byLabel.first()
  throw new Error('Admin 未找到订单搜索/客户手机输入框')
}

async function resolveSearchButton(page) {
  const candidates = [
    page.getByRole('button', { name: /查询|Search|Filter/i }),
    page.locator('button.btn-primary').filter({ hasText: /查询|Search/i })
  ]
  for (const loc of candidates) {
    if (await loc.count()) return loc.first()
  }
  throw new Error('Admin 未找到查询按钮')
}

async function loginAdmin(page, { adminPhone, password }) {
  const loginUrl = await resolveAdminLoginUrl()
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await dumpAdminPage(page, 'admin_login_dom')

  await (await resolveUsernameInput(page)).fill(adminPhone)
  await (await resolvePasswordInput(page)).fill(password)
  await (await resolveLoginButton(page)).click()
  await page.waitForURL(/\/admin\//, { timeout: 30000 })
  await dumpAdminPage(page, 'admin_dashboard_dom')
}

async function runAdminLoginOnly(ctx) {
  const { chromium } = require('playwright')
  const browser = await chromium.launch({ headless: false, channel: 'chrome' })
  const page = await browser.newPage()
  const screenshots = []
  try {
    await loginAdmin(page, ctx)
    screenshots.push({ label: 'admin_login_ok', path: await shot(page, 'admin_login_ok') })
    return { screenshots, url: page.url() }
  } finally {
    await browser.close()
  }
}

async function shot(page, label) {
  await ensureScreenshotDir()
  const file = path.join(SCREENSHOT_DIR, `${label}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function startAdminWebDevServer() {
  const url = await resolveAdminLoginUrl()
  try {
    const res = await fetch(url)
    if (res.ok) return { url, started: false }
  } catch {
    /* try spawn below */
  }

  if (adminProc && !adminProc.killed) {
    const again = await resolveAdminLoginUrl()
    return { url: again, started: false }
  }

  adminProc = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: ADMIN_WEB_ROOT,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: true,
    env: { ...process.env, BROWSER: 'none' }
  })
  adminProc.unref()

  const deadline = Date.now() + 120000
  while (Date.now() < deadline) {
    const url = await resolveAdminLoginUrl()
    try {
      const res = await fetch(url)
      if (res.ok) return { url, started: true }
    } catch {
      /* retry */
    }
    await sleep(2000)
  }
  throw new Error('Admin Web 启动超时 (npm run dev)')
}

async function stopAdminWebDevServer() {
  if (adminProc && !adminProc.killed) {
    try {
      process.kill(-adminProc.pid)
    } catch {
      try {
        adminProc.kill()
      } catch {
        /* ignore */
      }
    }
  }
  adminProc = null
}

async function runAdminFlow(ctx) {
  const { chromium } = require('playwright')
  const loginUrl = await resolveAdminLoginUrl()
  const browser = await chromium.launch({ headless: false, channel: 'chrome' })
  const page = await browser.newPage()
  const screenshots = []
  const base = loginUrl.replace(/\/login\/?$/, '')

  try {
    await loginAdmin(page, { adminPhone: ctx.adminPhone, password: ctx.password })
    screenshots.push({ label: '10_admin_login', path: await shot(page, '10_admin_login') })
    screenshots.push({ label: '11_admin_dashboard', path: await shot(page, '11_admin_dashboard') })

    await page.goto(`${base}/orders`, {
      waitUntil: 'domcontentloaded'
    })
    const searchInput = await resolveOrderSearchInput(page)
    await searchInput.fill(ctx.customerPhone)
    await (await resolveSearchButton(page)).click()
    await sleep(2000)
    screenshots.push({ label: '12_admin_orders_filtered', path: await shot(page, '12_admin_orders_filtered') })

    const confirmBtn = page.getByRole('button', { name: '确认付款' }).first()
    if (await confirmBtn.count()) {
      await confirmBtn.click()
      await sleep(2500)
      screenshots.push({
        label: '13_admin_deposit_confirmed',
        path: await shot(page, '13_admin_deposit_confirmed')
      })
    } else {
      throw new Error('Admin 未找到「确认付款」按钮，请确认 Client 已提交定金')
    }

    const oneClick = page.getByRole('button', { name: '一键派单' }).first()
    if (await oneClick.count()) {
      await oneClick.click()
      await sleep(2500)
    } else {
      const dispatchBtn = page.getByRole('button', { name: '派单' }).first()
      if (!(await dispatchBtn.count())) throw new Error('Admin 未找到派单按钮')
      await dispatchBtn.click()
      await sleep(1500)
      const pick = page.getByRole('button', { name: '选择派单' }).first()
      if (await pick.count()) await pick.click()
      await sleep(2500)
    }
    screenshots.push({ label: '14_admin_dispatched', path: await shot(page, '14_admin_dispatched') })

    await page.goto(`${base}/orders/${ctx.orderId}`, {
      waitUntil: 'domcontentloaded'
    })
    await sleep(1500)

    const requestBalance = page.getByRole('button', { name: '发起尾款收款' })
    if (await requestBalance.count()) {
      await requestBalance.click()
      await sleep(2000)
      screenshots.push({
        label: '15_admin_balance_requested',
        path: await shot(page, '15_admin_balance_requested')
      })
    }

    return { screenshots }
  } finally {
    await browser.close()
  }
}

async function runAdminBalanceConfirm(ctx) {
  const { chromium } = require('playwright')
  const loginUrl = await resolveAdminLoginUrl()
  const base = loginUrl.replace(/\/login\/?$/, '')
  const browser = await chromium.launch({ headless: false, channel: 'chrome' })
  const page = await browser.newPage()
  const screenshots = []

  try {
    await loginAdmin(page, { adminPhone: ctx.adminPhone, password: ctx.password })

    await page.goto(`${base}/orders/${ctx.orderId}`, {
      waitUntil: 'domcontentloaded'
    })
    await sleep(1500)

    const confirmBalance = page.getByRole('button', { name: '确认尾款到账' })
    if (await confirmBalance.count()) {
      await confirmBalance.click()
      await sleep(2000)
    }

    const markRemaining = page.getByRole('button', { name: '标记尾款已付' })
    if (await markRemaining.count()) {
      await markRemaining.click()
      await sleep(1500)
    }

    screenshots.push({
      label: '16_admin_balance_confirmed',
      path: await shot(page, '16_admin_balance_confirmed')
    })
    return { screenshots }
  } finally {
    await browser.close()
  }
}

module.exports = {
  SCREENSHOT_DIR,
  resolveAdminLoginUrl,
  startAdminWebDevServer,
  stopAdminWebDevServer,
  dumpAdminPage,
  resolveOrderSearchInput,
  loginAdmin,
  runAdminLoginOnly,
  runAdminFlow,
  runAdminBalanceConfirm
}
