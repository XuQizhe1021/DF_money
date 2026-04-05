<script setup lang="ts">
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { AmmoLatestItem } from "../types/api";

const props = defineProps<{
  rows: AmmoLatestItem[];
}>();

const priceChartRef = ref<HTMLElement | null>(null);
const caliberChartRef = ref<HTMLElement | null>(null);
let priceChart: echarts.ECharts | null = null;
let caliberChart: echarts.ECharts | null = null;

const topRows = computed(() => [...props.rows].sort((a, b) => b.price - a.price).slice(0, 10));
const caliberStats = computed(() => {
  const stat = new Map<string, number>();
  props.rows.forEach((item) => {
    const key = (item.caliber || "未知").trim();
    stat.set(key, (stat.get(key) || 0) + 1);
  });
  return [...stat.entries()].sort((a, b) => b[1] - a[1]);
});

const ensureCharts = async () => {
  await nextTick();
  if (!priceChart && priceChartRef.value) {
    priceChart = echarts.init(priceChartRef.value);
  }
  if (!caliberChart && caliberChartRef.value) {
    caliberChart = echarts.init(caliberChartRef.value);
  }
};

const renderCharts = async () => {
  await ensureCharts();
  if (priceChart) {
    const names = topRows.value.map((item) => item.name);
    const values = topRows.value.map((item) => item.price);
    priceChart.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: 36, right: 20, top: 20, bottom: 56 },
      xAxis: { type: "category", data: names, axisLabel: { interval: 0, rotate: 28 } },
      yAxis: { type: "value" },
      series: [
        {
          name: "价格",
          type: "bar",
          itemStyle: { borderRadius: [6, 6, 0, 0], color: "#2563eb" },
          data: values,
        },
      ],
    });
  }
  if (caliberChart) {
    const labels = caliberStats.value.map((item) => item[0]);
    const counts = caliberStats.value.map((item) => item[1]);
    caliberChart.setOption({
      tooltip: { trigger: "axis" },
      grid: { left: 36, right: 20, top: 20, bottom: 40 },
      xAxis: { type: "value" },
      yAxis: { type: "category", data: labels },
      series: [
        {
          name: "数量",
          type: "bar",
          itemStyle: { borderRadius: [0, 6, 6, 0], color: "#22c55e" },
          data: counts,
        },
      ],
    });
  }
};

const onResize = () => {
  priceChart?.resize();
  caliberChart?.resize();
};

watch(
  () => props.rows,
  async () => {
    await renderCharts();
  },
  { deep: true }
);

onMounted(async () => {
  await renderCharts();
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  priceChart?.dispose();
  caliberChart?.dispose();
  priceChart = null;
  caliberChart = null;
});
</script>

<template>
  <div class="analytics-grid">
    <div class="card">
      <h3>实时价格Top10（柱状图）</h3>
      <div ref="priceChartRef" class="mini-chart"></div>
    </div>
    <div class="card">
      <h3>子弹口径分布（柱状图）</h3>
      <div ref="caliberChartRef" class="mini-chart"></div>
    </div>
  </div>
</template>
