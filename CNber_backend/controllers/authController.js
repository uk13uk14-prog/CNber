const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      phone: user.phone,
      role: user.role
    },
    process.env.JWT_SECRET || 'cnber-secret',
    { expiresIn: '7d' }
  )
}

exports.register = async (req, res, next) => {
  try {
    const { phone, password, role = 'user' } = req.body

    if (!phone || !password) {
      return res.status(400).json({ message: '手机号和密码不能为空' })
    }

    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      return res.status(409).json({ message: '该手机号已注册' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      phone,
      password: hashedPassword,
      role
    })

    const token = signToken(user)

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    next(error)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ message: '手机号和密码不能为空' })
    }

    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(401).json({ message: '用户不存在' })
    }

    const match = await bcrypt.compare(password, user.password || '')
    if (!match) {
      return res.status(401).json({ message: '密码错误' })
    }

    const token = signToken(user)

    res.json({
      message: '登录成功',
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    next(error)
  }
}
