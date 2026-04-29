const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role
    },
    process.env.JWT_SECRET || 'cnber-secret',
    { expiresIn: '7d' }
  )
}

exports.register = async (req, res) => {
  const { phone, password } = req.body
  const role = req.body.role === 'driver' ? 'driver' : 'user'

  if (!phone || !password) {
    const e = new Error('手机号和密码不能为空')
    e.code = 400
    throw e
  }

  const existingUser = await User.findOne({ phone })
  if (existingUser) {
    const e = new Error('该手机号已注册')
    e.code = 409
    throw e
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({
    phone,
    password: hashedPassword,
    role
  })

  const token = signToken(user)

  res.status(201).json({
    code: 0,
    message: 'success',
    data: {
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role
      }
    }
  })
}

exports.login = async (req, res) => {
  const { phone, password } = req.body

  if (!phone || !password) {
    const e = new Error('手机号和密码不能为空')
    e.code = 400
    throw e
  }

  const user = await User.findOne({ phone }).select('+password')
  if (!user) {
    const e = new Error('用户不存在')
    e.code = 401
    throw e
  }

  const match = await bcrypt.compare(password, user.password || '')
  if (!match) {
    const e = new Error('密码错误')
    e.code = 401
    throw e
  }

  const token = signToken(user)

  res.json({
    code: 0,
    message: 'success',
    data: {
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role
      }
    }
  })
}
