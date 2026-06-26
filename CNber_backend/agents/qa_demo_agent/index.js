#!/usr/bin/env node
/**
 * CNber QA Demo Agent 入口（包装现有 scripts/cnberDemoAgent.js，不重构核心逻辑）
 */
require('dotenv').config()

const path = require('path')
const { reportPath } = require('../_shared/paths')

const jsonReport = reportPath('qa_demo_report.json')
process.env.DEMO_AGENT_REPORT = jsonReport
process.argv[2] = jsonReport

require('../../scripts/cnberDemoAgent.js')
