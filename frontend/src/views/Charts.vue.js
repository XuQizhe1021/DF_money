import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { settingsApi } from "../api/modules/settings";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";
const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const chartRef = ref(null);
const deltaChartRef = ref(null);
const selectedAmmoId = ref("");
const selectedWindowHours = ref(168);
const fetchGap = ref(0);
const fetchIntervalHours = ref(1);
let chart = null;
let deltaChart = null;
let refreshTimer = null;
const parseServerTime = (value) => {
    const hasExplicitTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(value);
    const normalized = hasExplicitTimezone ? value : `${value}Z`;
    return new Date(normalized);
};
const toAxisLabel = (value) => {
    const parsed = parseServerTime(value);
    if (Number.isNaN(parsed.getTime())) {
        return value.replace("T", " ");
    }
    const text = parsed.toLocaleString("zh-CN", { hour12: false });
    if (fetchIntervalHours.value <= 6) {
        return text.slice(5, 16).replace("/", "-");
    }
    return text.slice(0, 16).replace("/", "-");
};
const sampleByFetchGap = (source, gap) => {
    const normalizedGap = Math.max(0, Math.floor(gap));
    const stride = normalizedGap + 1;
    const sorted = [...source].sort((a, b) => parseServerTime(a.recorded_at).getTime() - parseServerTime(b.recorded_at).getTime());
    if (stride <= 1) {
        return sorted.map((item) => ({ recorded_at: item.recorded_at, price: Number(item.price) }));
    }
    const sampled = [];
    for (let idx = 0; idx < sorted.length; idx += stride) {
        sampled.push({ recorded_at: sorted[idx].recorded_at, price: Number(sorted[idx].price) });
    }
    const last = sorted[sorted.length - 1];
    if (last && sampled[sampled.length - 1]?.recorded_at !== last.recorded_at) {
        sampled.push({ recorded_at: last.recorded_at, price: Number(last.price) });
    }
    return sampled;
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
    const grouped = sampleByFetchGap(marketStore.historyItems, fetchGap.value);
    const xData = grouped.map((item) => item.recorded_at);
    const yData = grouped.map((item) => item.price);
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
        title: xData.length ? undefined : { text: "暂无走势数据", left: "center", top: "middle", textStyle: { color: "#64748b", fontSize: 14 } },
    }, { lazyUpdate: true });
};
const renderDeltaChart = () => {
    if (!deltaChart) {
        return;
    }
    const grouped = sampleByFetchGap(marketStore.historyItems, fetchGap.value);
    const labels = [];
    const deltas = [];
    for (let idx = 1; idx < grouped.length; idx += 1) {
        const current = Number(grouped[idx].price);
        const prev = Number(grouped[idx - 1].price);
        labels.push(grouped[idx].recorded_at);
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
                    color: (params) => (params.value >= 0 ? "#22c55e" : "#ef4444"),
                    borderRadius: [4, 4, 0, 0],
                },
            },
        ],
        title: labels.length ? undefined : { text: "暂无变动数据", left: "center", top: "middle", textStyle: { color: "#64748b", fontSize: 14 } },
    }, { lazyUpdate: true });
};
const refreshHistory = async () => {
    if (!selectedAmmoId.value) {
        return;
    }
    selectedWindowHours.value = Math.max(1, Math.floor(Number(selectedWindowHours.value) || 1));
    fetchGap.value = Math.max(0, Math.floor(Number(fetchGap.value) || 0));
    const requestDays = Math.max(1, Math.ceil(selectedWindowHours.value / 24));
    await marketStore.fetchHistory(selectedAmmoId.value, requestDays);
    if (marketStore.errorHistory) {
        notificationStore.push("error", marketStore.errorHistory);
        return;
    }
    await ensureChart();
    if (marketStore.historyItems.length > 0) {
        const latestAt = parseServerTime(marketStore.historyItems[marketStore.historyItems.length - 1].recorded_at).getTime();
        const minTime = latestAt - selectedWindowHours.value * 3600000;
        marketStore.historyItems = marketStore.historyItems.filter((item) => {
            const ts = parseServerTime(item.recorded_at).getTime();
            return Number.isFinite(ts) && ts >= minTime;
        });
    }
    renderChart();
    renderDeltaChart();
    chart?.resize();
    deltaChart?.resize();
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
watch(() => [selectedAmmoId.value, selectedWindowHours.value, fetchGap.value], async () => {
    scheduleRefresh();
});
onMounted(async () => {
    try {
        const dsResp = await settingsApi.getDataSourceConfig();
        fetchIntervalHours.value = Math.max(1, Number(dsResp.data.fetch_interval_hours || 1));
        selectedWindowHours.value = Math.max(24, fetchIntervalHours.value * 24);
        fetchGap.value = 0;
    }
    catch {
        fetchIntervalHours.value = 1;
        fetchGap.value = 0;
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "stack" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedAmmoId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
    disabled: true,
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.ammoOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (item.value),
        value: (item.value),
    });
    (item.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
    step: "1",
});
(__VLS_ctx.selectedWindowHours);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    step: "1",
});
(__VLS_ctx.fetchGap);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshHistory) },
    ...{ class: "btn" },
    disabled: (__VLS_ctx.marketStore.loadingHistory),
});
(__VLS_ctx.marketStore.loadingHistory ? "加载中..." : "刷新走势");
if (__VLS_ctx.marketStore.loadingHistory) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else if (__VLS_ctx.marketStore.errorHistory) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card error" },
    });
    (__VLS_ctx.marketStore.errorHistory);
}
else if (__VLS_ctx.marketStore.historyItems.length < 2) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card chart-tip" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "analytics-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "chartRef",
    ...{ class: "card chart" },
});
/** @type {typeof __VLS_ctx.chartRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "deltaChartRef",
    ...{ class: "card chart" },
});
/** @type {typeof __VLS_ctx.deltaChartRef} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['analytics-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            marketStore: marketStore,
            chartRef: chartRef,
            deltaChartRef: deltaChartRef,
            selectedAmmoId: selectedAmmoId,
            selectedWindowHours: selectedWindowHours,
            fetchGap: fetchGap,
            refreshHistory: refreshHistory,
            ammoOptions: ammoOptions,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
