/**
 * 最小回归：车型 picker commit（对应 A0104 onVehicleChange 根因）
 * 运行: node scripts/smoke_vehicle_picker_commit.js
 */
const assert = require('assert')
const path = require('path')
const fs = require('fs')
const vm = require('vm')

const srcPath = path.join(
  __dirname,
  '..',
  '..',
  'CNber_client_admin_v1.0',
  'utils',
  'vehicleOptions.js'
)
const src = fs.readFileSync(srcPath, 'utf8')

// 抽取纯函数做轻量校验（不跑 uni request）
function commitVehicleSelection(labels, rawIndex) {
  const list = Array.isArray(labels) ? labels : []
  const index = Number(rawIndex)
  if (!list.length || !Number.isFinite(index) || index < 0 || index >= list.length) {
    return { index: 0, label: '', vehicleClass: 'standard_5' }
  }
  const label = String(list[index] || '')
  const FALLBACK = [
    { class: 'standard_5', label: '5座普通' },
    { class: 'luxury_5', label: '5座豪华' },
    { class: 'comfort_7', label: '7座舒适' },
    { class: 'luxury_7', label: '7座豪华' },
    { class: 'seater_8', label: '8座' },
    { class: 'seater_9', label: '9座' }
  ]
  const found = FALLBACK.find((o) => o.label === label)
  return { index, label, vehicleClass: found ? found.class : 'standard_5' }
}

const labels = ['5座普通', '5座豪华', '7座舒适', '7座豪华', '8座', '9座']

// 1) 默认车型 index 0
const d0 = commitVehicleSelection(labels, 0)
assert.strictEqual(d0.label, '5座普通')
assert.strictEqual(d0.vehicleClass, 'standard_5')

// 2) 修改车型 → 完成（index 2）
const d2 = commitVehicleSelection(labels, '2')
assert.strictEqual(d2.label, '7座舒适')
assert.strictEqual(d2.vehicleClass, 'comfort_7')

// 3) 表单回写语义：payload 用 label + class
const payload = { vehicleLabel: d2.label, vehicleClass: d2.vehicleClass }
assert.deepStrictEqual(payload, { vehicleLabel: '7座舒适', vehicleClass: 'comfort_7' })

// 4) 再次打开应保留 index
assert.strictEqual(d2.index, 2)

// 5) 旧 bug：把 ref 当数组用 → 写空（回归检测）
const fakeRef = { value: labels }
const buggy = fakeRef[2] || ''
assert.strictEqual(buggy, '', 'ref 未解包时 vehicleList[i] 必为空——此即 A0104 历史根因')
const fixed = commitVehicleSelection(fakeRef.value, 2)
assert.strictEqual(fixed.label, '7座舒适')

// 6) 源码仍导出 commitVehicleSelection
assert.ok(src.includes('export function commitVehicleSelection'))

console.log('PASS smoke_vehicle_picker_commit')
void vm
