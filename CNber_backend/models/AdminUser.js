const mongoose = require('mongoose')

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('AdminUser', AdminUserSchema)