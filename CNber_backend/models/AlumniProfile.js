const mongoose = require('mongoose')

const alumniSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  school: String,
  major: String,
  year: String, // 入学年份
  status: { type: String, default: 'pending' }, // pending / approved
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('AlumniProfile', alumniSchema)
