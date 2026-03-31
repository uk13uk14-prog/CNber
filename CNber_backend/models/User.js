const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['user', 'driver'],
    default: 'user'
  }
})

module.exports = mongoose.model('User', UserSchema)
