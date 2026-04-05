import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
const props = defineProps();
const priceChartRef = ref(null);
const caliberChartRef = ref(null);
let priceChart = null;
let caliberChart = null;
const topRows = computed(() => [...props.rows].sort((a, b) => b.price - a.price).slice(0, 10));
const caliberStats = computed(() => {
    const stat = new Map();
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
watch(() => props.rows, async () => {
    await renderCharts();
}, { deep: true });
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "analytics-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "priceChartRef",
    ...{ class: "mini-chart" },
});
/** @type {typeof __VLS_ctx.priceChartRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "caliberChartRef",
    ...{ class: "mini-chart" },
});
/** @type {typeof __VLS_ctx.caliberChartRef} */ ;
/** @type {__VLS_StyleScopedClasses['analytics-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-chart']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            priceChartRef: priceChartRef,
            caliberChartRef: caliberChartRef,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
