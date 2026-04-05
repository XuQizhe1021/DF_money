import * as echarts from "echarts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
const props = defineProps();
const priceChartRef = ref(null);
let priceChart = null;
const topRows = computed(() => [...props.rows].sort((a, b) => b.price - a.price).slice(0, 10));
const ensureCharts = async () => {
    await nextTick();
    if (!priceChart && priceChartRef.value) {
        priceChart = echarts.init(priceChartRef.value);
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
};
const onResize = () => {
    priceChart?.resize();
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
    priceChart = null;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "priceChartRef",
    ...{ class: "mini-chart" },
});
/** @type {typeof __VLS_ctx.priceChartRef} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-chart']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            priceChartRef: priceChartRef,
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
