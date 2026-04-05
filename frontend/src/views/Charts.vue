<script setup lang="ts">
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";

const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const chartRef = ref<HTMLElement | null>(null);
const selectedAmmoId = ref("");
const selectedDays = ref<7 | 30>(7);
let chart: echarts.ECharts | null = null;
let refreshTimer: number | null = null;

const ensureChart = async () => {
  await nextTick();
  if (!chartRef.value) {
    return;
  }
  if (!chart) {
    chart = echarts.init(chartRef.value);
  }
};

const renderChart = () => {
  if (!chart) {
    return;
  }
  const xData = marketStore.historyItems.map((item) => item.recorded_at);
  const yData = marketStore.historyItems.map((item) => item.price);
  chart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 20, bottom: 50 },
    xAxis: { type: "category", data: xData },
    yAxis: { type: "value" },
    dataZoom: xData.length > 120 ? [{ type: "inside" }, { type: "slider" }] : [],
    series: [
      {
        name: "价格",
        type: "line",
        smooth: true,
        showSymbol: false,
        sampling: "lttb",
        animation: false,
        data: yData,
      },
    ],
  }, { lazyUpdate: true });
};

const refreshHistory = async () => {
  if (!selectedAmmoId.value) {
    return;
  }
  await marketStore.fetchHistory(selectedAmmoId.value, selectedDays.value);
  if (marketStore.errorHistory) {
    notificationStore.push("error", marketStore.errorHistory);
    return;
  }
  renderChart();
};

const scheduleRefresh = () => {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
  }
  // 通过轻量防抖合并快速切换触发，避免短时间重复请求。
  refreshTimer = window.setTimeout(async () => {
    refreshTimer = null;
    await refreshHistory();
  }, 180);
};

const ammoOptions = computed(() => marketStore.ammoOptions);

watch(
  () => [selectedAmmoId.value, selectedDays.value],
  async () => {
    scheduleRefresh();
  }
);

onMounted(async () => {
  await marketStore.fetchLatest();
  selectedAmmoId.value = marketStore.latestItems[0]?.id ?? "";
  await ensureChart();
  await refreshHistory();
  window.addEventListener("resize", onResize);
});

const onResize = () => {
  chart?.resize();
};

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  window.removeEventListener("resize", onResize);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <section class="stack">
    <div class="card row">
      <label>
        子弹筛选
        <select v-model="selectedAmmoId">
          <option value="" disabled>请选择子弹</option>
          <option v-for="item in ammoOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label>
        时间范围
        <select v-model.number="selectedDays">
          <option :value="7">7日</option>
          <option :value="30">30日</option>
        </select>
      </label>
      <button class="btn" :disabled="marketStore.loadingHistory" @click="refreshHistory">
        {{ marketStore.loadingHistory ? "加载中..." : "刷新走势" }}
      </button>
    </div>

    <div v-if="marketStore.loadingHistory" class="card">历史走势加载中...</div>
    <div v-else-if="marketStore.errorHistory" class="card error">{{ marketStore.errorHistory }}</div>
    <div v-else-if="marketStore.historyItems.length === 0" class="card">暂无走势数据</div>
    <div v-else ref="chartRef" class="card chart"></div>
  </section>
</template>
