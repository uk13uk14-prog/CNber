<template>
  <div>
    <p>
      <router-link to="/orders">← 返回列表</router-link>
    </p>
    <div v-if="error" class="card err">{{ error }}</div>
    <template v-else-if="order._id">
      <h2>订单详情</h2>
      <div class="card">
        <p><strong>订单号</strong> {{ order._id }}</p>
        <p>
          <strong>状态</strong>
          <span class="badge">{{ orderStatusDisplayLabel(order.status, order) }}</span>
        </p>
        <p v-if="depositSubmittedPendingConfirm(order)" class="hint">
          定金已提交，待 admin 确认后方可派单。
          <router-link :to="{ name: 'payment-reviews', query: { stage: 'deposit' } }">前往支付审核</router-link>
        </p>
        <p v-else-if="!depositConfirmedForDispatch(order) && ['pending', 'deposit_paid'].includes(order.status)" class="hint">
          定金未确认，不能派单。请在下方「人工支付」确认客户定金。
        </p>
        <p v-if="order.status === 'assigned'" class="hint">
          已指派司机，等待司机在司机端确认接单（POST /api/order/accept）。
        </p>
        <p v-if="order.status === 'cancelled'" class="hint hint-cancel">
          订单已取消。与乘客端规则一致：不进入完成页，行程相关页轮询将优先跳转订单历史。
        </p>
        <p><strong>客户手机</strong> {{ phoneOf(order.userId) }}</p>
        <p><strong>上车</strong> {{ order.pickup }}</p>
        <p><strong>下车</strong> {{ order.destination }}</p>
        <p><strong>服务类型</strong> {{ serviceTypeLabel(order.serviceType) }}</p>
        <p v-if="order.vehicleLabel"><strong>车型</strong> {{ order.vehicleLabel }}</p>
        <p><strong>客户订单总额</strong> {{ money(orderAmountCny) }}</p>
        <template v-if="order.couponCode">
          <p><strong>优惠码</strong> {{ order.couponCode }}</p>
          <p><strong>原价 (CNY)</strong> {{ formatCny(order.originalAmountCny ?? order.customerPriceCny) }}</p>
          <p><strong>优惠金额</strong> -{{ formatCny(order.discountAmountCny) }}</p>
          <p><strong>实付 (CNY)</strong> {{ formatCny(order.payableAmountCny) }}</p>
        </template>
        <p><strong>支付概要</strong> {{ paymentSummaryLabel(order) }}</p>
        <p><strong>订金 / 尾款</strong> {{ depositRemainingSummaryLabel(order) }}</p>
        <p><strong>调度状态</strong> {{ dispatchStatusLabel(order.dispatchStatus) }}</p>
        <p><strong>司机</strong> {{ phoneOf(order.driverId) || '未分配' }}</p>
        <p class="muted">创建：{{ fmt(order.createdAt) }} · 更新：{{ fmt(order.updatedAt) }}</p>
      </div>

      <div v-if="orderRating" class="card">
        <h3>乘客评价</h3>
        <p><strong>司机评分</strong> {{ orderRating.driverStars }} / 5</p>
        <p><strong>服务评分</strong> {{ orderRating.serviceStars }} / 5</p>
        <p v-if="orderRating.comment"><strong>评价内容</strong> {{ orderRating.comment }}</p>
        <p v-if="orderRating.tags?.length">
          <strong>标签</strong>
          {{ orderRating.tags.join('、') }}
        </p>
        <p class="muted">评价时间：{{ fmt(orderRating.createdAt) }}</p>
      </div>
      <div v-else-if="order.ratingStatus === 'rated'" class="card muted">
        <p>乘客已评价（详情加载中或暂无明细）</p>
      </div>

      <h3>财务信息</h3>
      <div class="card finance">
        <p><strong>客户订单总额</strong> {{ money(orderAmountCny) }}</p>
        <template v-if="order.couponCode">
          <p><strong>优惠码</strong> {{ order.couponCode }}</p>
          <p><strong>原价 (CNY)</strong> {{ formatCny(order.originalAmountCny ?? order.customerPriceCny) }}</p>
          <p><strong>优惠</strong> -{{ formatCny(order.discountAmountCny) }}</p>
          <p><strong>实付 (CNY)</strong> {{ formatCny(order.payableAmountCny) }}</p>
        </template>
        <p><strong>已收定金</strong> {{ money(depositAmount) }} · {{ depositDisplayLabel(order) }}</p>
        <p><strong>待收尾款</strong> {{ money(remainingAmount) }} · {{ order.remainingPaid ? '已付' : '未付' }}</p>
        <p><strong>已付金额</strong> {{ money(paidAmountCny) }}</p>
        <p><strong>司机结算</strong> {{ driverPayout == null ? '待确认' : money(driverPayout) }}</p>
        <p><strong>平台毛利</strong> {{ money(platformProfit) }}</p>
        <div class="pay-actions">
          <button type="button" class="btn" :disabled="paying || order.depositPaid" @click="markDeposit">
            标记订金已付
          </button>
          <button type="button" class="btn" :disabled="paying || !order.depositPaid || order.remainingPaid" @click="markRemaining">
            标记尾款已付
          </button>
        </div>
        <p v-if="payErr" class="err">{{ payErr }}</p>
      </div>

      <h3>人工支付</h3>
      <div class="card pay-flow">
        <p class="muted">不接第三方支付；客户线下转账后由运营在后台确认到账。</p>
        <p v-if="paymentFlowErr" class="err">{{ paymentFlowErr }}</p>

        <h4>定金</h4>
        <p>
          <strong>状态</strong> {{ depositStatusLabel(payDepositStatus) }} ·
          <strong>应付定金</strong> {{ money(payDepositAmount) }}
        </p>
        <p v-if="order.payment?.depositConfirmedAt" class="muted">
          确认时间：{{ fmt(order.payment.depositConfirmedAt) }}
        </p>
        <template v-if="order.depositPaymentInfo && (order.depositPaymentInfo.payerName || order.depositPaymentInfo.submittedAt)">
          <p><strong>付款人</strong> {{ order.depositPaymentInfo.payerName || '—' }}</p>
          <p v-if="order.depositPaymentInfo.transactionRef">
            <strong>付款流水号</strong> {{ order.depositPaymentInfo.transactionRef }}
          </p>
          <p><strong>定金付款方式</strong> {{ depositPaymentMethodLine }}</p>
          <p><strong>定金收款账户</strong> {{ depositPaymentAccountLine }}</p>
          <p><strong>定金付款备注</strong> {{ depositPaymentNoteLine }}</p>
          <p><strong>付款金额</strong> {{ money(order.depositPaymentInfo.paidAmount) }}</p>
          <p><strong>提交时间</strong> {{ fmt(order.depositPaymentInfo.submittedAt) || '—' }}</p>
          <p v-if="depositProofUrl">
            <strong>支付截图</strong>
            <a :href="depositProofUrl" target="_blank" rel="noopener">查看凭证</a>
          </p>
          <p v-if="order.depositPaymentInfo.rejectedReason" class="err">
            驳回原因：{{ order.depositPaymentInfo.rejectedReason }}
          </p>
        </template>
        <div v-if="canShowDepositConfirmActions" class="pay-actions">
          <button type="button" class="btn btn-primary" :disabled="flowBusy" @click="onConfirmDeposit">
            {{ depositSubmittedPendingConfirm(order) ? '确认定金到账' : '确认已收定金' }}
          </button>
          <template v-if="depositSubmittedPendingConfirm(order)">
            <input v-model="rejectDepositReason" class="input inline-reason" placeholder="驳回原因（可选）" />
            <button type="button" class="btn btn-danger" :disabled="flowBusy" @click="onRejectDeposit">驳回定金</button>
          </template>
        </div>

        <h4>尾款</h4>
        <p>
          <strong>状态</strong> {{ balanceStatusLabel(payBalanceStatus) }} ·
          <strong>应付尾款</strong> {{ money(payBalanceAmount) }}
        </p>
        <p v-if="order.payment?.balanceConfirmedAt" class="muted">
          确认时间：{{ fmt(order.payment.balanceConfirmedAt) }}
        </p>
        <p v-if="order.payment?.paymentNote" class="muted">备注：{{ order.payment.paymentNote }}</p>
        <template v-if="order.balancePaymentInfo && (order.balancePaymentInfo.payerName || order.balancePaymentInfo.submittedAt)">
          <p><strong>付款人</strong> {{ order.balancePaymentInfo.payerName || '—' }}</p>
          <p v-if="order.balancePaymentInfo.transactionRef">
            <strong>付款流水号</strong> {{ order.balancePaymentInfo.transactionRef }}
          </p>
          <p><strong>尾款付款方式</strong> {{ balancePaymentMethodLine }}</p>
          <p><strong>尾款收款账户</strong> {{ balancePaymentAccountLine }}</p>
          <p><strong>尾款付款备注</strong> {{ balancePaymentNoteLine }}</p>
          <p><strong>付款金额</strong> {{ money(order.balancePaymentInfo.paidAmount) }}</p>
          <p><strong>提交时间</strong> {{ fmt(order.balancePaymentInfo.submittedAt) || '—' }}</p>
          <p v-if="balanceProofUrl">
            <strong>支付截图</strong>
            <a :href="balanceProofUrl" target="_blank" rel="noopener">查看凭证</a>
          </p>
          <p v-if="order.balancePaymentInfo.rejectedReason" class="err">
            驳回原因：{{ order.balancePaymentInfo.rejectedReason }}
          </p>
        </template>
        <div class="pay-actions">
          <button
            type="button"
            class="btn"
            :disabled="flowBusy || !canRequestBalance"
            @click="onRequestBalance"
          >
            发起尾款收款
          </button>
          <button
            v-if="canConfirmBalanceMvp"
            type="button"
            class="btn btn-primary"
            :disabled="flowBusy"
            @click="onConfirmBalance"
          >
            确认已收尾款
          </button>
          <button
            v-else-if="order.balanceStatus === 'submitted'"
            type="button"
            class="btn btn-primary"
            :disabled="flowBusy"
            @click="onConfirmBalance"
          >
            确认尾款到账
          </button>
          <input v-model="rejectBalanceReason" class="input inline-reason" placeholder="驳回尾款原因（可选）" />
          <button
            v-if="order.balanceStatus === 'submitted'"
            type="button"
            class="btn btn-danger"
            :disabled="flowBusy"
            @click="onRejectBalance"
          >
            驳回尾款
          </button>
        </div>

        <h4>司机结算</h4>
        <p>
          <strong>状态</strong> {{ settlementLabel(order.driverSettlementStatus) }} ·
          <strong>金额</strong> {{ driverPayout == null ? '待确认' : money(driverPayout) }}
        </p>
        <div v-if="order.status === 'completed'" class="pay-actions">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="flowBusy || order.driverSettlementStatus === 'paid'"
            @click="onConfirmDriverSettlement"
          >
            确认已给司机结算
          </button>
        </div>
      </div>

      <h3>订单时间线</h3>
      <div class="card timeline-card">
        <p class="timeline-foot">
          以下基于现有字段拼装，不做推断性「假时间」。精确指派/接单/开始等节点需在订单模型增加独立时间戳后展示。
        </p>
        <ul class="timeline">
          <li v-for="(row, idx) in systemTimeline" :key="'sys-' + idx">
            <div class="tl-dot" />
            <div class="tl-body">
              <div class="tl-title">{{ row.label }}</div>
              <div class="tl-time">{{ row.time || '—' }}</div>
              <div v-if="row.note" class="tl-note">{{ row.note }}</div>
            </div>
          </li>
        </ul>
        <h4 class="subh">备注时间线（真实记录）</h4>
        <ul v-if="notesTimeline.length" class="timeline notes-tl">
          <li v-for="(row, idx) in notesTimeline" :key="'note-' + idx">
            <div class="tl-dot soft" />
            <div class="tl-body">
              <div class="tl-title">{{ row.label }}</div>
              <div class="tl-time">{{ row.time }}</div>
              <div class="tl-note pre">{{ row.body }}</div>
            </div>
          </li>
        </ul>
        <p v-else class="muted">暂无跟进备注</p>
      </div>

      <h3>运营日志</h3>
      <div class="card">
        <p v-if="!operationLogs.length" class="muted">暂无运营操作记录</p>
        <ul v-else class="op-logs">
          <li v-for="(log, idx) in operationLogs" :key="idx">
            <div class="op-head">
              <strong>{{ actionLabel(log.action) }}</strong>
              <span class="muted">{{ fmt(log.createdAt) }}</span>
            </div>
            <div class="op-meta muted">
              {{ log.operatorPhone || '—' }}
            </div>
            <div v-if="log.message" class="op-msg">{{ log.message }}</div>
          </li>
        </ul>
      </div>

      <h3>跟进备注</h3>
      <div class="card">
        <div class="quick">
          <span class="quick-label">快捷短语：</span>
          <button
            v-for="p in notePhrases"
            :key="p"
            type="button"
            class="btn chip"
            @click="appendPhrase(p)"
          >
            {{ p }}
          </button>
        </div>
        <div v-if="!sortedNotes.length" class="muted">暂无备注</div>
        <ul v-else class="notes">
          <li v-for="(n, idx) in sortedNotes" :key="idx">
            <div class="note-meta">
              <strong>{{ authorOf(n) }}</strong>
              <span class="muted">{{ fmt(n.createdAt) }}</span>
            </div>
            <div class="note-body">{{ n.content }}</div>
          </li>
        </ul>
        <label class="lbl">新增备注</label>
        <textarea
          v-model="noteDraft"
          class="ta"
          rows="3"
          placeholder="记录沟通、异常、处理进展等"
        />
        <button
          type="button"
          class="btn btn-primary"
          :disabled="noteSaving || !noteDraft.trim()"
          @click="submitNote"
        >
          {{ noteSaving ? '提交中…' : '保存备注' }}
        </button>
        <p v-if="noteErr" class="err">{{ noteErr }}</p>
      </div>

      <h3>客服 SOP（试运营）</h3>
      <div class="card sop">
        <p v-if="order.exceptionType">
          <strong>异常</strong> {{ exceptionLabel(order.exceptionType) }}
          <span v-if="order.exceptionReason"> · {{ order.exceptionReason }}</span>
        </p>
        <p>
          <strong>服务状态</strong> {{ serviceStatusLabel(order.serviceStatus) }}
          <span v-if="order.nextAction"> · 下一步：{{ order.nextAction }}</span>
          <span v-if="order.nextActionAt" class="muted">（{{ fmt(order.nextActionAt) }}）</span>
        </p>
        <label class="lbl">下一步动作</label>
        <input v-model="sopNextAction" class="input" placeholder="如：等待客户上传定金截图" />
        <label class="lbl">内部备注</label>
        <textarea v-model="sopInternalDraft" class="ta" rows="2" />
        <button type="button" class="btn" :disabled="p0Busy" @click="saveSopInternal">保存内部备注</button>
        <label class="lbl">客户沟通</label>
        <textarea v-model="sopCustomerDraft" class="ta" rows="2" />
        <button type="button" class="btn" :disabled="p0Busy" @click="saveSopCustomer">记录客户沟通</button>
        <label class="lbl">司机沟通</label>
        <textarea v-model="sopDriverDraft" class="ta" rows="2" />
        <button type="button" class="btn" :disabled="p0Busy" @click="saveSopDriver">记录司机沟通</button>
        <button type="button" class="btn btn-primary" :disabled="p0Busy" @click="saveSopMeta">更新下一步</button>
        <p v-if="p0Err" class="err">{{ p0Err }}</p>
        <ul v-if="mergedSopLogs.length" class="notes">
          <li v-for="(row, i) in mergedSopLogs" :key="i">
            <span class="pill">{{ row.kind }}</span>
            <strong>{{ row.author }}</strong>
            <span class="muted">{{ row.time }}</span>
            <div>{{ row.body }}</div>
          </li>
        </ul>
      </div>

      <h3>异常与人工处理</h3>
      <div class="card pay-actions">
        <button type="button" class="btn btn-danger" :disabled="p0Busy" @click="onAdminCancel">后台取消</button>
        <button type="button" class="btn" :disabled="p0Busy" @click="onChangePrice">改价</button>
        <button type="button" class="btn" :disabled="p0Busy" @click="onRefundPending">标记待退款</button>
        <button type="button" class="btn" :disabled="p0Busy" @click="onRefundConfirm">确认退款</button>
        <button type="button" class="btn" :disabled="p0Busy" @click="onDisputeOpen">开启争议</button>
        <button type="button" class="btn" :disabled="p0Busy" @click="onDisputeClose">关闭争议</button>
        <button type="button" class="btn btn-primary" :disabled="p0Busy" @click="onCloseOrder">运营结案</button>
        <router-link
          v-if="order._id"
          :to="{ name: 'order-dispatch', params: { id: order._id } }"
          class="btn"
        >
          重新派司机
        </router-link>
      </div>

      <div class="actions">
        <router-link
          v-if="['pending', 'deposit_paid'].includes(order.status) && depositConfirmedForDispatch(order)"
          :to="`/orders/${order._id}/dispatch`"
          class="btn btn-primary"
        >
          分配司机
        </router-link>
        <span
          v-else-if="['pending', 'deposit_paid'].includes(order.status)"
          class="btn btn-primary disabled-link"
          :title="depositSubmittedPendingConfirm(order) ? '定金已提交，待 admin 确认' : '定金未确认，不能派单'"
        >
          分配司机（{{ depositSubmittedPendingConfirm(order) ? '定金待确认' : '定金未确认' }}）
        </span>
        <template v-else-if="order.status === 'assigned'">
          <button
            type="button"
            class="btn btn-danger"
            :disabled="revoking"
            @click="revokeAssign"
          >
            {{ revoking ? '处理中…' : '撤销指派' }}
          </button>
          <span class="muted inline-hint">将回到「待接单」并清空司机</span>
          <p v-if="revokeErr" class="err">{{ revokeErr }}</p>
        </template>
        <span v-else class="muted">当前状态不可再分配司机</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  fetchOrderById,
  markOrderDepositPaid,
  markOrderRemainingPaid,
  postOrderNote,
  postAdminOrderStatus,
  confirmOrderDeposit,
  rejectOrderDeposit,
  requestOrderBalance,
  confirmOrderBalance,
  rejectOrderBalance,
  confirmDriverSettlement,
  adminCancelOrder,
  adminChangePrice,
  adminRefundOrder,
  adminDisputeOrder,
  adminCloseOrder,
  patchOrderSop,
  postOrderInternalNote,
  postOrderCustomerLog,
  postOrderDriverLog
} from '@/api/admin'
import { orderStatusLabel } from '@/utils/orderStatus'
import {
  depositConfirmedForDispatch,
  depositSubmittedPendingConfirm,
  depositDisplayLabel,
  orderStatusDisplayLabel,
  paymentSummaryLabel,
  depositRemainingSummaryLabel
} from '@/utils/depositDispatch'
import { serviceTypeLabel } from '@/utils/serviceType'
import { EXCEPTION_LABELS, SERVICE_STATUS_LABELS } from '@/utils/p0Labels'
import { paymentMethodLabel, paymentAccountLabel } from '@/utils/paymentDisplay'
import { formatCny, customerOrderAmountCny, driverSettlementAmountCny } from '@/utils/currencyDisplay'

const route = useRoute()
const order = ref({})
const error = ref('')
const noteDraft = ref('')
const noteSaving = ref(false)
const noteErr = ref('')
const revoking = ref(false)
const revokeErr = ref('')
const paying = ref(false)
const payErr = ref('')
const flowBusy = ref(false)
const paymentFlowErr = ref('')
const rejectDepositReason = ref('')
const rejectBalanceReason = ref('')
const finance = ref(null)
const orderRating = ref(null)
const p0Busy = ref(false)
const p0Err = ref('')
const sopNextAction = ref('')
const sopInternalDraft = ref('')
const sopCustomerDraft = ref('')
const sopDriverDraft = ref('')

const depositProofUrl = computed(
  () => order.value.depositProofImage || order.value.depositPaymentInfo?.proofImage || ''
)
const balanceProofUrl = computed(
  () => order.value.balanceProofImage || order.value.balancePaymentInfo?.proofImage || ''
)

function paymentInfoLines(info, fallbackNote) {
  const method = paymentMethodLabel(info?.paymentMethod || info?.method)
  const account = paymentAccountLabel(info?.paymentAccount)
  const note = String(info?.remark || fallbackNote || '').trim() || '—'
  return { method, account, note }
}

const depositPaymentMethodLine = computed(() =>
  paymentInfoLines(order.value.depositPaymentInfo, order.value.depositNote).method
)
const depositPaymentAccountLine = computed(() =>
  paymentInfoLines(order.value.depositPaymentInfo, order.value.depositNote).account
)
const depositPaymentNoteLine = computed(() =>
  paymentInfoLines(order.value.depositPaymentInfo, order.value.depositNote).note
)
const balancePaymentMethodLine = computed(() =>
  paymentInfoLines(order.value.balancePaymentInfo, order.value.balanceNote).method
)
const balancePaymentAccountLine = computed(() =>
  paymentInfoLines(order.value.balancePaymentInfo, order.value.balanceNote).account
)
const balancePaymentNoteLine = computed(() =>
  paymentInfoLines(order.value.balancePaymentInfo, order.value.balanceNote).note
)

function exceptionLabel(t) {
  return EXCEPTION_LABELS[t] || t || '—'
}
function serviceStatusLabel(s) {
  return SERVICE_STATUS_LABELS[s] || s || '—'
}

const mergedSopLogs = computed(() => {
  const rows = []
  const push = (kind, list) => {
    for (const n of list || []) {
      rows.push({
        kind,
        author: n.authorDisplay || '—',
        time: fmt(n.createdAt),
        body: n.content,
        ts: new Date(n.createdAt).getTime()
      })
    }
  }
  push('内部', order.value.internalNotes)
  push('客户', order.value.customerCommunicationLogs)
  push('司机', order.value.driverCommunicationLogs)
  return rows.sort((a, b) => (b.ts || 0) - (a.ts || 0))
})

const notePhrases = [
  '客户已确认',
  '司机已联系',
  '改单处理中',
  '待回电',
  '异常',
  '已取消'
]

const operationLogs = computed(() => {
  const list = order.value.operationLogs || []
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return tb - ta
  })
})

const sortedNotes = computed(() => {
  const list = order.value.followUpNotes || []
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return tb - ta
  })
})

function actionLabel(action) {
  const map = {
    confirm_deposit: '确认定金',
    confirm_balance: '确认尾款',
    assign_driver: '派单',
    reassign_driver: '改派',
    unassign_driver: '取消派单',
    driver_cancel_assignment: '司机取消派单',
    driver_cancel_request: '司机申请取消',
    customer_approve_driver_cancel: '乘客同意取消',
    customer_reject_driver_cancel: '乘客拒绝取消',
    update_status: '修改状态',
    manual_quote: '手动报价',
    auto_quote: '自动报价'
  }
  return map[action] || action || '操作'
}

/** 备注按时间正序，便于时间线阅读 */
const notesAsc = computed(() => {
  const list = order.value.followUpNotes || []
  return [...list].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    return ta - tb
  })
})

const notesTimeline = computed(() => {
  return notesAsc.value.map((n) => ({
    label: authorOf(n),
    time: fmt(n.createdAt),
    body: n.content || ''
  }))
})

const orderAmountCny = computed(() => customerOrderAmountCny(order.value) ?? 0)

const totalPrice = computed(() => orderAmountCny.value)

const depositAmount = computed(() => {
  const o = order.value || {}
  if (o.displayDepositDueCny != null && o.displayDepositDueCny !== '') {
    return Number(o.displayDepositDueCny)
  }
  const n = customerOrderAmountCny(o)
  return n ? Math.round(n * 0.1 * 100) / 100 : 0
})

const remainingAmount = computed(() => {
  const o = order.value || {}
  if (o.displayRemainingDueCny != null && o.displayRemainingDueCny !== '') {
    return Number(o.displayRemainingDueCny)
  }
  const n = customerOrderAmountCny(o) || 0
  return Math.max(0, Math.round((n - Number(paidAmountCny.value || 0)) * 100) / 100)
})

const paidAmountCny = computed(() => {
  const o = order.value || {}
  if (o.displayPaidAmountCny != null && o.displayPaidAmountCny !== '') {
    return Number(o.displayPaidAmountCny)
  }
  const n = Number(o.paidAmount)
  const total = customerOrderAmountCny(o)
  if (Number.isFinite(n) && total && n >= total * 0.05) return n
  return Number.isFinite(n) && n >= 1 && (!total || n >= total * 0.05) ? n : 0
})

const driverPayout = computed(() => driverSettlementAmountCny(order.value))

const platformProfit = computed(() => {
  const o = order.value || {}
  const n = Number(o.platformProfitCny ?? o.displayPlatformProfitCny)
  return Number.isFinite(n) ? n : null
})

function mvpStatus(raw, legacy) {
  if (raw === 'submitted') return 'pending'
  if (raw === 'rejected') return 'unpaid'
  if (['unpaid', 'pending', 'confirmed'].includes(raw)) return raw
  if (legacy === 'submitted') return 'pending'
  if (legacy === 'rejected') return 'unpaid'
  if (['unpaid', 'pending', 'confirmed'].includes(legacy)) return legacy
  return 'unpaid'
}

const payDepositStatus = computed(() =>
  mvpStatus(order.value.payment?.depositStatus, order.value.depositStatus)
)
const payBalanceStatus = computed(() =>
  mvpStatus(order.value.payment?.balanceStatus, order.value.balanceStatus)
)
const payDepositAmount = computed(() => Number(depositAmount.value || 0))
const payBalanceAmount = computed(() => Number(remainingAmount.value || 0))

const canShowDepositConfirmActions = computed(() => {
  const o = order.value
  if (!o._id || depositConfirmedForDispatch(o)) return false
  if (depositSubmittedPendingConfirm(o)) return true
  if (!o.paymentStage || o.paymentStage === 'none') {
    return payDepositStatus.value !== 'confirmed' && !o.depositPaid
  }
  return false
})

const canConfirmBalanceMvp = computed(() => {
  const o = order.value
  if (!o._id) return false
  if (payDepositStatus.value !== 'confirmed' && !o.depositPaid) return false
  return payBalanceStatus.value !== 'confirmed' && !o.remainingPaid
})

const canRequestBalance = computed(() => {
  const o = order.value
  if (!o._id) return false
  const stage = o.paymentStage || 'none'
  if (['balance_pending', 'balance_submitted', 'balance_confirmed', 'completed'].includes(stage)) return false
  if (o.depositStatus === 'confirmed') return true
  if (o.depositPaid) return true
  if (o.paymentStatus === 'paid') return true
  return false
})

const systemTimeline = computed(() => {
  const o = order.value
  if (!o || !o._id) return []
  const rows = []
  rows.push({
    label: '创建订单',
    time: fmt(o.createdAt),
    note: ''
  })

  const st = o.status
  const hasDriver = !!(o.driverId && (typeof o.driverId === 'object' ? o.driverId._id || o.driverId.phone : o.driverId))

  if (['quoted', 'confirmed', 'deposit_paid', 'assigned', 'driver_accepted', 'ready_to_start', 'in_progress', 'arrived', 'completed'].includes(st)) {
    rows.push({
      label: orderStatusLabel(st),
      time: fmt(o.updatedAt),
      note: ''
    })
  }

  if (hasDriver && !['created', 'quoted', 'confirmed', 'deposit_paid', 'pending'].includes(st)) {
    rows.push({
      label: '已关联司机（后台指派或抢单写入）',
      time: '—',
      note: '模型未单独存储「指派时间」字段'
    })
  }

  if (['accepted', 'driver_accepted', 'ready_to_start', 'started', 'in_progress', 'arrived', 'completed'].includes(st)) {
    rows.push({
      label: '司机已接单',
      time: '—',
      note: '模型未单独存储「接单时间」字段'
    })
  }

  if (['started', 'in_progress', 'arrived', 'completed'].includes(st)) {
    rows.push({
      label: '行程已开始',
      time: '—',
      note: '模型未单独存储「开始时间」字段'
    })
  }

  if (st === 'completed') {
    rows.push({
      label: '订单已完成',
      time: fmt(o.updatedAt),
      note: '时间为 Mongo 文档最近更新时间（updatedAt），可能与实际完成瞬间有偏差；可后续增加 completedAt'
    })
  }

  if (st === 'cancelled') {
    rows.push({
      label: '订单已取消',
      time: fmt(o.updatedAt),
      note: '时间为文档最近更新时间；可后续增加 cancelledAt'
    })
  }

  return rows
})

function phoneOf(ref) {
  if (!ref) return ''
  if (typeof ref === 'object' && ref.phone) return ref.phone
  return ''
}

function authorOf(n) {
  if (n.authorDisplay) return n.authorDisplay
  if (n.authorPhone) return n.authorPhone
  return '—'
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('zh-CN')
}

function money(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? formatCny(n) : '—'
}

function dispatchStatusLabel(status) {
  const map = {
    pending: '未派单',
    unassigned: '未派单',
    assigned: '已指派',
    accepted: '司机已接',
    rejected: '司机拒绝/超时',
    needs_redispatch: '待重新派单',
    cancelled: '派单取消',
    completed: '已完成'
  }
  return map[status || 'pending'] || status
}

function paymentStageLabel(stage) {
  const map = {
    none: '—',
    deposit_pending: '待付定金',
    deposit_submitted: '定金待审核',
    deposit_confirmed: '定金已确认',
    balance_pending: '待付尾款',
    balance_submitted: '尾款待审核',
    balance_confirmed: '尾款已确认',
    completed: '支付流程已结束'
  }
  return map[stage || 'none'] || stage || '—'
}

function depositStatusLabel(s) {
  const map = {
    unpaid: '未付',
    pending: '待确认',
    submitted: '待确认',
    confirmed: '已确认',
    rejected: '已驳回'
  }
  return map[s || 'unpaid'] || s || '—'
}

function balanceStatusLabel(s) {
  const map = {
    unpaid: '未付',
    pending: '待确认',
    submitted: '待确认',
    confirmed: '已确认',
    rejected: '已驳回'
  }
  return map[s || 'unpaid'] || s || '—'
}

function settlementLabel(s) {
  const map = { not_required: '无需', pending: '待结算', paid: '已结算' }
  return map[s || 'not_required'] || s || '—'
}

function appendPhrase(text) {
  const t = noteDraft.value.trim()
  noteDraft.value = t ? `${t} ${text}` : text
}

function applyOrderData(data) {
  order.value = data.order || data || {}
  finance.value = data.finance || null
  orderRating.value = data.rating || null
  sopNextAction.value = order.value.nextAction || ''
}

async function runP0(fn) {
  p0Busy.value = true
  p0Err.value = ''
  try {
    const data = await fn()
    applyOrderData(data)
  } catch (e) {
    p0Err.value = e.message || '操作失败'
  } finally {
    p0Busy.value = false
  }
}

async function saveSopInternal() {
  if (!sopInternalDraft.value.trim()) return
  await runP0(() => postOrderInternalNote(route.params.id, sopInternalDraft.value.trim()))
  sopInternalDraft.value = ''
}
async function saveSopCustomer() {
  if (!sopCustomerDraft.value.trim()) return
  await runP0(() => postOrderCustomerLog(route.params.id, sopCustomerDraft.value.trim()))
  sopCustomerDraft.value = ''
}
async function saveSopDriver() {
  if (!sopDriverDraft.value.trim()) return
  await runP0(() => postOrderDriverLog(route.params.id, sopDriverDraft.value.trim()))
  sopDriverDraft.value = ''
}
async function saveSopMeta() {
  await runP0(() =>
    patchOrderSop(route.params.id, {
      nextAction: sopNextAction.value,
      serviceStatus: order.value.serviceStatus || 'active'
    })
  )
}

async function onAdminCancel() {
  const reason = window.prompt('取消原因', '') || ''
  if (!window.confirm('确认后台取消该订单？')) return
  await runP0(() => adminCancelOrder(route.params.id, { by: 'admin', reason }))
}
async function onChangePrice() {
  const raw = window.prompt('新总价（¥）', String(orderAmountCny.value || ''))
  if (raw == null) return
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0) {
    p0Err.value = '金额无效'
    return
  }
  const reason = window.prompt('改价原因', '') || ''
  await runP0(() => adminChangePrice(route.params.id, { amount, reason }))
}
async function onRefundPending() {
  const reason = window.prompt('退款说明', '') || ''
  await runP0(() => adminRefundOrder(route.params.id, { target: 'full', reason, confirm: false }))
}
async function onRefundConfirm() {
  const reason = window.prompt('确认退款说明', '') || ''
  if (!window.confirm('确认已退款？')) return
  await runP0(() => adminRefundOrder(route.params.id, { target: 'full', reason, confirm: true }))
}
async function onDisputeOpen() {
  const note = window.prompt('争议说明', '') || ''
  await runP0(() => adminDisputeOrder(route.params.id, { action: 'open', note }))
}
async function onDisputeClose() {
  const note = window.prompt('结案说明', '') || ''
  await runP0(() => adminDisputeOrder(route.params.id, { action: 'close', note }))
}
async function onCloseOrder() {
  const note = window.prompt('结案备注', '试运营结案') || ''
  if (!window.confirm('确认运营结案？')) return
  await runP0(() => adminCloseOrder(route.params.id, { note }))
}

async function load() {
  error.value = ''
  noteErr.value = ''
  try {
    const data = await fetchOrderById(route.params.id)
    applyOrderData(data)
  } catch (e) {
    error.value = e.message || '加载失败'
  }
}

async function submitNote() {
  if (!noteDraft.value.trim()) return
  noteSaving.value = true
  noteErr.value = ''
  try {
    const data = await postOrderNote(route.params.id, noteDraft.value.trim())
    order.value = data.order || order.value
    noteDraft.value = ''
  } catch (e) {
    noteErr.value = e.message || '保存失败'
  } finally {
    noteSaving.value = false
  }
}

async function markDeposit() {
  paying.value = true
  payErr.value = ''
  try {
    const data = await markOrderDepositPaid(route.params.id)
    order.value = data.order || order.value
  } catch (e) {
    payErr.value = e.message || '标记订金失败'
  } finally {
    paying.value = false
  }
}

async function markRemaining() {
  paying.value = true
  payErr.value = ''
  try {
    const data = await markOrderRemainingPaid(route.params.id)
    order.value = data.order || order.value
  } catch (e) {
    payErr.value = e.message || '标记尾款失败'
  } finally {
    paying.value = false
  }
}

async function onConfirmDeposit() {
  flowBusy.value = true
  paymentFlowErr.value = ''
  try {
    const data = await confirmOrderDeposit(route.params.id)
    order.value = data.order || order.value
  } catch (e) {
    paymentFlowErr.value = e.message || '确认失败'
  } finally {
    flowBusy.value = false
  }
}

async function onRejectDeposit() {
  flowBusy.value = true
  paymentFlowErr.value = ''
  try {
    const data = await rejectOrderDeposit(route.params.id, {
      reason: rejectDepositReason.value.trim()
    })
    order.value = data.order || order.value
    rejectDepositReason.value = ''
  } catch (e) {
    paymentFlowErr.value = e.message || '驳回失败'
  } finally {
    flowBusy.value = false
  }
}

async function onRequestBalance() {
  flowBusy.value = true
  paymentFlowErr.value = ''
  try {
    const data = await requestOrderBalance(route.params.id)
    order.value = data.order || order.value
  } catch (e) {
    paymentFlowErr.value = e.message || '发起失败'
  } finally {
    flowBusy.value = false
  }
}

async function onConfirmBalance() {
  flowBusy.value = true
  paymentFlowErr.value = ''
  try {
    const data = await confirmOrderBalance(route.params.id)
    order.value = data.order || order.value
  } catch (e) {
    paymentFlowErr.value = e.message || '确认失败'
  } finally {
    flowBusy.value = false
  }
}

async function onRejectBalance() {
  flowBusy.value = true
  paymentFlowErr.value = ''
  try {
    const data = await rejectOrderBalance(route.params.id, {
      reason: rejectBalanceReason.value.trim()
    })
    order.value = data.order || order.value
    rejectBalanceReason.value = ''
  } catch (e) {
    paymentFlowErr.value = e.message || '驳回失败'
  } finally {
    flowBusy.value = false
  }
}

async function onConfirmDriverSettlement() {
  flowBusy.value = true
  paymentFlowErr.value = ''
  try {
    const data = await confirmDriverSettlement(route.params.id, {})
    order.value = data.order || order.value
  } catch (e) {
    paymentFlowErr.value = e.message || '操作失败'
  } finally {
    flowBusy.value = false
  }
}

async function revokeAssign() {
  if (!confirm('确定撤销指派？订单将回到「待接单」并清空当前司机。')) return
  revoking.value = true
  revokeErr.value = ''
  try {
    const data = await postAdminOrderStatus(route.params.id, 'pending')
    order.value = data.order || {}
  } catch (e) {
    revokeErr.value = e.message || '撤销失败'
  } finally {
    revoking.value = false
  }
}

onMounted(load)
watch(
  () => route.params.id,
  () => load()
)
</script>

<style scoped>
.actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.finance {
  margin-bottom: 20px;
}
.pay-flow h4 {
  margin: 18px 0 8px;
  font-size: 15px;
}
.pay-flow .inline-reason {
  min-width: 160px;
  margin-left: 8px;
}
.pay-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.err {
  color: var(--danger);
}
a.btn {
  display: inline-block;
  text-decoration: none;
  line-height: 1.2;
}
.disabled-link {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}
.hint {
  font-size: 13px;
  color: #92400e;
  background: #fffbeb;
  padding: 8px 12px;
  border-radius: 6px;
}
.hint-cancel {
  color: #7f1d1d;
  background: #fee2e2;
}
.inline-hint {
  font-size: 13px;
}
.btn-danger {
  background: #dc2626;
  color: #fff;
  border: 1px solid #b91c1c;
  border-radius: var(--radius);
  padding: 8px 16px;
  cursor: pointer;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.quick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.quick-label {
  font-size: 13px;
  color: var(--muted);
}
.chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #f9fafb;
  cursor: pointer;
}
.chip:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
}
.notes {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}
.notes li {
  border-bottom: 1px solid var(--border);
  padding: 12px 0;
}
.note-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  margin-bottom: 6px;
}
.note-body {
  white-space: pre-wrap;
  line-height: 1.5;
}
.op-logs {
  list-style: none;
  padding: 0;
  margin: 0;
}
.op-logs li {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.op-logs li:last-child {
  border-bottom: none;
}
.op-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.op-meta {
  font-size: 12px;
  margin-top: 4px;
}
.op-msg {
  margin-top: 6px;
  line-height: 1.5;
}
.lbl {
  display: block;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}
.ta {
  width: 100%;
  max-width: 560px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 10px;
  font-family: inherit;
}

.timeline-card {
  margin-bottom: 20px;
}
.timeline-foot {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 14px;
}
.subh {
  font-size: 14px;
  margin: 18px 0 10px;
  color: #374151;
}
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}
.timeline li {
  display: flex;
  gap: 12px;
  padding: 10px 0 10px 4px;
  border-left: 2px solid #e5e7eb;
  margin-left: 8px;
}
.timeline li:last-child {
  border-left-color: transparent;
}
.tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  margin-left: -17px;
  margin-top: 5px;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #e5e7eb;
}
.tl-dot.soft {
  background: #94a3b8;
}
.tl-body {
  flex: 1;
  min-width: 0;
}
.tl-title {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
}
.tl-time {
  font-size: 13px;
  color: #4b5563;
  margin-top: 4px;
}
.tl-note {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.45;
}
.tl-note.pre {
  white-space: pre-wrap;
}
.notes-tl li {
  border-left-color: #cbd5e1;
}
</style>
