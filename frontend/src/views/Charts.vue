<script setup lang="ts">
import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { settingsApi } from "../api/modules/settings";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";

const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const chartRef = ref<HTMLElement | null>(null);
const deltaChartRef = ref<HTMLElement | null>(null);
const selectedAmmoId = ref("");
const selectedWindowHours = ref(168);
const fetchIntervalHours = ref(1);
let chart: echarts.ECharts | null = null;
let deltaChart: echarts.ECharts | null = null;
let refreshTimer: number | null = null;

const toAxisLabel = (value: string) => {
  const text = value.replace("T", " ");
  if (fetchIntervalHours.value <= 6) {
    return text.slice(5, 16);
  }
  return text.slice(0, 16);
};

const ensureChart = async () => {
  await nextTick();
  if (!chartRef.value) {
    return;
  }
  if (!chart) {
    chart = echarts.init(chartRef.value);
  }
  if (!deltaChart && deltaChartRef.value) {
    deltaChart = echarts.init(deltaChartRef.value);
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
    xAxis: { type: "category", data: xData, axisLabel: { formatter: toAxisLabel, rotate: 20 } },
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

const renderDeltaChart = () => {
  if (!deltaChart) {
    return;
  }
  const labels: string[] = [];
  const deltas: number[] = [];
  for (let idx = 1; idx < marketStore.historyItems.length; idx += 1) {
    const current = Number(marketStore.historyItems[idx].price);
    const prev = Number(marketStore.historyItems[idx - 1].price);
    labels.push(marketStore.historyItems[idx].recorded_at);
    deltas.push(Number((current - prev).toFixed(4)));
  }
  deltaChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 40, right: 20, top: 20, bottom: 56 },
    xAxis: { type: "category", data: labels, axisLabel: { interval: 0, rotate: 20, formatter: toAxisLabel } },
    yAxis: { type: "value" },
    series: [
      {
        name: "价格变动",
        type: "bar",
        data: deltas,
        itemStyle: {
          color: (params: { value: number }) => (params.value >= 0 ? "#22c55e" : "#ef4444"),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }, { lazyUpdate: true });
};

const refreshHistory = async () => {
  if (!selectedAmmoId.value) {
    return;
  }
  const requestDays = Math.max(1, Math.ceil(selectedWindowHours.value / 24));
  await marketStore.fetchHistory(selectedAmmoId.value, requestDays);
  if (marketStore.errorHistory) {
    notificationStore.push("error", marketStore.errorHistory);
    return;
  }
  if (marketStore.historyItems.length > 0) {
    const latestAt = new Date(marketStore.historyItems[marketStore.historyItems.length - 1].recorded_at).getTime();
    const minTime = latestAt - selectedWindowHours.value * 3600_000;
    marketStore.historyItems = marketStore.historyItems.filter((item) => {
      const ts = new Date(item.recorded_at).getTime();
      return Number.isFinite(ts) && ts >= minTime;
    });
  }
  renderChart();
  renderDeltaChart();
  if (marketStore.historyItems.length < 2) {
    notificationStore.push("info", "历史数据点不足2条，走势与涨跌分析会偏弱，连续采集后将自动改善");
  }
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
  () => [selectedAmmoId.value, selectedWindowHours.value],
  async () => {
    scheduleRefresh();
  }
);

onMounted(async () => {
  try {
    const dsResp = await settingsApi.getDataSourceConfig();
    fetchIntervalHours.value = Math.max(1, Number(dsResp.data.fetch_interval_hours || 1));
    selectedWindowHours.value = Math.max(24, fetchIntervalHours.value * 24);
  } catch {
    fetchIntervalHours.value = 1;
  }
  await marketStore.fetchLatest();
  selectedAmmoId.value = marketStore.latestItems[0]?.id ?? "";
  await ensureChart();
  await refreshHistory();
  window.addEventListener("resize", onResize);
});

const onResize = () => {
  chart?.resize();
  deltaChart?.resize();
};

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  window.removeEventListener("resize", onResize);
  chart?.dispose();
  deltaChart?.dispose();
  chart = null;
  deltaChart = null;
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
        观察窗口（小时）
        <select v-model.number="selectedWindowHours">
          <option :value="24">24小时</option>
          <option :value="72">72小时</option>
          <option :value="168">168小时（7天）</option>
          <option :value="720">720小时（30天）</option>
        </select>
      </label>
      <button class="btn" :disabled="marketStore.loadingHistory" @click="refreshHistory">
        {{ marketStore.loadingHistory ? "加载中..." : "刷新走势" }}
      </button>
    </div>

    <div v-if="marketStore.loadingHistory" class="card">历史走势加载中...</div>
    <div v-else-if="marketStore.errorHistory" class="card error">{{ marketStore.errorHistory }}</div>
    <div v-else-if="marketStore.historyItems.length === 0" class="card">暂无走势数据</div>
    <template v-else>
      <div class="card chart-tip" v-if="marketStore.historyItems.length < 2">
        当前历史样本不足，建议保持系统运行并每天采集，7日后可获得更稳定的趋势判断。
      </div>
      <div class="analytics-grid">
        <div ref="chartRef" class="card chart"></div>
        <div ref="deltaChartRef" class="card chart"></div>
      </div>
    </template>
  </section>
</template>
