const BASE_URL = 'http://localhost:3100/api'
const DEFAULT_PASSWORD = '123456'

const randomPhone = () => {
  const suffix = Math.floor(Math.random() * 90000000 + 10000000)
  return `44${suffix}`
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const request = async (method, path, { token, body } = {}) => {
  const headers = {
    'Content-Type': 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  let data = null
  try {
    data = await response.json()
  } catch (error) {
    data = { message: '响应不是合法 JSON' }
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  }
}

const printStep = (step, title) => {
  console.log(`\n[步骤 ${step}] ${title}`)
}

const printSuccess = (message, payload) => {
  console.log(`✅ ${message}`)
  if (payload !== undefined) {
    console.log(JSON.stringify(payload, null, 2))
  }
}

const printFailure = (message, payload) => {
  console.error(`❌ ${message}`)
  if (payload !== undefined) {
    console.error(JSON.stringify(payload, null, 2))
  }
}

const assertOk = (result, fallbackMessage) => {
  if (!result.ok) {
    const error = new Error(result.data?.message || fallbackMessage)
    error.response = result
    throw error
  }
}

const unwrapData = (res) => res.data?.data

async function main() {
  const userPhone = randomPhone()
  const driverPhone = randomPhone()

  let userToken = ''
  let driverToken = ''
  let createdOrderId = ''

  try {
    printStep(1, '注册普通用户')
    const registerUserRes = await request('POST', '/auth/register', {
      body: {
        phone: userPhone,
        password: DEFAULT_PASSWORD
      }
    })
    assertOk(registerUserRes, '用户注册失败')
    printSuccess('用户注册成功', registerUserRes.data)

    printStep(2, '登录普通用户')
    const loginUserRes = await request('POST', '/auth/login', {
      body: {
        phone: userPhone,
        password: DEFAULT_PASSWORD
      }
    })
    assertOk(loginUserRes, '用户登录失败')
    userToken = unwrapData(loginUserRes)?.token || ''
    if (!userToken) {
      throw new Error('用户登录成功但未返回 token')
    }
    printSuccess('用户登录成功', {
      token: userToken,
      user: unwrapData(loginUserRes)?.user
    })

    printStep(3, '创建订单')
    const createOrderRes = await request('POST', '/order/create', {
      token: userToken,
      body: {
        pickup: 'London Heathrow Airport',
        destination: 'Cambridge City Centre'
      }
    })
    assertOk(createOrderRes, '创建订单失败')
    createdOrderId = unwrapData(createOrderRes)?.order?._id || ''
    if (!createdOrderId) {
      throw new Error('创建订单成功但未返回 orderId')
    }
    printSuccess('订单创建成功', createOrderRes.data)

    printStep(4, '用户获取订单列表')
    const userOrderListRes = await request('GET', '/order/list', {
      token: userToken
    })
    assertOk(userOrderListRes, '用户获取订单列表失败')
    printSuccess('用户订单列表获取成功', userOrderListRes.data)

    printStep(5, '注册司机账号')
    const registerDriverRes = await request('POST', '/auth/register', {
      body: {
        phone: driverPhone,
        password: DEFAULT_PASSWORD,
        role: 'driver'
      }
    })
    assertOk(registerDriverRes, '司机注册失败')
    printSuccess('司机注册成功', registerDriverRes.data)

    printStep(6, '登录司机账号')
    const loginDriverRes = await request('POST', '/auth/login', {
      body: {
        phone: driverPhone,
        password: DEFAULT_PASSWORD
      }
    })
    assertOk(loginDriverRes, '司机登录失败')
    driverToken = unwrapData(loginDriverRes)?.token || ''
    if (!driverToken) {
      throw new Error('司机登录成功但未返回 token')
    }
    printSuccess('司机登录成功', {
      token: driverToken,
      user: unwrapData(loginDriverRes)?.user
    })

    printStep(7, '司机获取订单列表')
    const driverOrderListRes = await request('GET', '/order/list', {
      token: driverToken
    })
    assertOk(driverOrderListRes, '司机获取订单列表失败')
    printSuccess('司机订单列表获取成功', driverOrderListRes.data)

    const driverVisibleOrder = (
      unwrapData(driverOrderListRes)?.orders || []
    ).find((order) => order._id === createdOrderId)
    if (!driverVisibleOrder) {
      throw new Error('司机订单列表中未找到刚创建的订单')
    }

    printStep(8, '司机接单')
    const acceptOrderRes = await request('POST', '/order/accept', {
      token: driverToken,
      body: {
        orderId: createdOrderId
      }
    })
    assertOk(acceptOrderRes, '司机接单失败')
    printSuccess('司机接单成功', acceptOrderRes.data)

    printStep(9, '司机开始行程')
    const startOrderRes = await request('POST', '/order/start', {
      token: driverToken,
      body: {
        orderId: createdOrderId
      }
    })
    assertOk(startOrderRes, '开始行程失败')
    printSuccess('开始行程成功', startOrderRes.data)

    printStep(10, '司机完成订单')
    const completeOrderRes = await request('POST', '/order/complete', {
      token: driverToken,
      body: {
        orderId: createdOrderId
      }
    })
    assertOk(completeOrderRes, '完成订单失败')
    printSuccess('完成订单成功', completeOrderRes.data)

    printStep(11, '用户再次获取订单列表并确认 completed')
    await sleep(300)
    const finalUserOrdersRes = await request('GET', '/order/list', {
      token: userToken
    })
    assertOk(finalUserOrdersRes, '用户再次获取订单列表失败')

    const finalOrder = (unwrapData(finalUserOrdersRes)?.orders || []).find(
      (order) => order._id === createdOrderId
    )

    if (!finalOrder) {
      throw new Error('用户订单列表中未找到目标订单')
    }

    if (finalOrder.status !== 'completed') {
      throw new Error(`订单状态校验失败，当前状态为 ${finalOrder.status}`)
    }

    printSuccess('主链路测试通过，订单状态已完成', {
      orderId: createdOrderId,
      finalStatus: finalOrder.status,
      finalOrder
    })

    console.log('\n🎉 全部测试完成')
  } catch (error) {
    printFailure('测试中断', {
      message: error.message,
      response: error.response || null
    })
    process.exitCode = 1
  }
}

main()
