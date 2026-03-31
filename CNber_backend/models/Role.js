const mongoose = require('mongoose')

const roleSchema = new mongoose.Schema({
  name: String,
  permissions: [[
  {
    "name": "超级管理员",
    "permissions": ["users", "orders", "drivers", "tickets", "ai", "roles"]
  },
  {
    "name": "客服",
    "permissions": ["users", "tickets", "ai"]
  },
  {
    "name": "审核员",
    "permissions": ["drivers", "orders"]
  }
]
], // 例如 ["users", "orders", "drivers", "tickets"]
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Role', roleSchema)
