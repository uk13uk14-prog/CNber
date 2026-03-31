<template>
  <div class="analytics-page">
    <el-card>
      <div class="charts-container" ref="chartRef" style="height: 400px;"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const chartRef = ref(null)

const initChart = async () => {
  const res = await request.get('/logs/analytics')
  const data = res.data

  const chart = echarts.init(chartRef.value)
  chart.setOption({
    title: { text: 'CNber 系统行为趋势图' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['访问量', '下单量', 'AI客服调用'] },
    xAxis: { type: 'category', data: data.labels },
    yAxis: { type: 'value' },
    series: [
      { name: '访问量', type: 'line', data: data.pv },
      { name: '下单量', type: 'line', data: data.orders },
      { name: 'AI客服调用', type: 'line', data: data.ai }
    ]
  })
}

onMounted(() => {
  initChart()
})
</script>

<style scoped>
.analytics-page {
  padding: 20px;
}
</style>
