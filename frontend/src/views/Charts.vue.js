import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";
const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const chartRef = ref(null);
const selectedAmmoId = ref("");
const selectedDays = ref(7);
let chart = null;
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
        xAxis: { type: "category", data: xData },
        yAxis: { type: "value" },
        series: [
            {
                name: "价格",
                type: "line",
                smooth: true,
                data: yData,
            },
        ],
    });
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
const ammoOptions = computed(() => marketStore.ammoOptions);
watch(() => [selectedAmmoId.value, selectedDays.value], async () => {
    await refreshHistory();
});
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
    window.removeEventListener("resize", onResize);
    chart?.dispose();
    chart = null;
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
    value: (__VLS_ctx.selectedDays),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (7),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (30),
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "chartRef",
        ...{ class: "card chart" },
    });
    /** @type {typeof __VLS_ctx.chartRef} */ ;
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
/** @type {__VLS_StyleScopedClasses['chart']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            marketStore: marketStore,
            chartRef: chartRef,
            selectedAmmoId: selectedAmmoId,
            selectedDays: selectedDays,
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
