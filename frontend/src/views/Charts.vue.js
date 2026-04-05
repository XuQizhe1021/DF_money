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
const fetchIntervalHours = ref(1);
let chart = null;
let deltaChart = null;
let refreshTimer = null;
const toAxisLabel = (value) => {
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
    const labels = [];
    const deltas = [];
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
                    color: (params) => (params.value >= 0 ? "#22c55e" : "#ef4444"),
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
        const minTime = latestAt - selectedWindowHours.value * 3600000;
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
watch(() => [selectedAmmoId.value, selectedWindowHours.value], async () => {
    scheduleRefresh();
});
onMounted(async () => {
    try {
        const dsResp = await settingsApi.getDataSourceConfig();
        fetchIntervalHours.value = Math.max(1, Number(dsResp.data.fetch_interval_hours || 1));
        selectedWindowHours.value = Math.max(24, fetchIntervalHours.value * 24);
    }
    catch {
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.selectedWindowHours),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (24),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (72),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (168),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (720),
});
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
else if (__VLS_ctx.marketStore.historyItems.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else {
    if (__VLS_ctx.marketStore.historyItems.length < 2) {
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
}
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
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
