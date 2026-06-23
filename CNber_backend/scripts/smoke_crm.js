#!/usr/bin/env node
/**
 * CRM 营销名单 smoke
 * 用法: node scripts/smoke_crm.js
 */
const assert = require('assert')
const { listCrmPresets, getCrmPreset } = require('../utils/crmAudiencePresets')
const { normalizeFilters, buildAudienceCsv } = require('../utils/crmAudienceResolver')

function testMarketingAudienceModel() {
  const MarketingAudience = require('../models/MarketingAudience')
  const schema = MarketingAudience.schema.obj
  assert.ok(schema.name)
  assert.ok(schema.filters)
  assert.ok(schema.customerIds)
  assert.ok(schema.count)
  assert.ok(schema.createdBy)
}

function testPresets() {
  const presets = listCrmPresets()
  assert.ok(presets.length >= 5)
  assert.ok(getCrmPreset('airport'))
  assert.ok(getCrmPreset('high_value'))
}

function testNormalizeDormant() {
  const f = normalizeFilters({ preset: 'dormant' })
  assert.ok(f.lastOrderAtBefore instanceof Date)
}

function testCsvExport() {
  const { filename, content } = buildAudienceCsv(
    [
      {
        phone: '13800000000',
        name: 'Test',
        customerType: 'student',
        totalOrders: 2,
        totalSpentCny: 900,
        tags: ['机场常客'],
        aiTags: ['机场用户'],
        lastOrderAt: new Date('2025-01-01'),
        marketingConsent: true
      }
    ],
    '机场客户'
  )
  assert.ok(filename.startsWith('crm_audience_'))
  assert.ok(content.includes('phone'))
  assert.ok(content.includes('13800000000'))
  assert.ok(content.includes('机场用户'))
}

testMarketingAudienceModel()
testPresets()
testNormalizeDormant()
testCsvExport()

console.log('smoke_crm ok')
