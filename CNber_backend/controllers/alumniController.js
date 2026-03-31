const AlumniProfile = require('../models/AlumniProfile')
const User = require('../models/User')

exports.getAlumniList = async (req, res) => {
  const { page = 1, keyword = '' } = req.query
  const pageSize = 10
  const query = keyword
    ? {
        $or: [
          { name: new RegExp(keyword, 'i') },
          { school: new RegExp(keyword, 'i') },
          { major: new RegExp(keyword, 'i') }
        ]
      }
    : {}

  const list = await AlumniProfile.find(query)
    .populate('userId', 'phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)

  const formatted = list.map(item => ({
    _id: item._id,
    name: item.name,
    phone: item.userId?.phone || '未知',
    school: item.school,
    major: item.major,
    year: item.year,
    status: item.status,
    createdAt: item.createdAt
  }))

  const total = await AlumniProfile.countDocuments(query)
  res.json({ alumni: formatted, total })
}
