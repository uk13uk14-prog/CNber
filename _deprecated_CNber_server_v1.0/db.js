const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/cnber', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const db = mongoose.connection
db.on('error', console.error.bind(console, '❌ Mongo连接失败'))
db.once('open', () => console.log('✅ Mongo连接成功'))

module.exports = db
