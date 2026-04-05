import { computed } from "vue";
const props = defineProps();
const label = computed(() => {
    if (props.ratio === null) {
        return "暂无数据";
    }
    const pct = `${(props.ratio * 100).toFixed(2)}%`;
    return props.ratio >= 0 ? `盈利 ${pct}` : `亏损 ${pct}`;
});
const cls = computed(() => {
    if (props.ratio === null) {
        return "neutral";
    }
    return props.ratio >= 0 ? "profit" : "loss";
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profit-badge" },
    ...{ class: (__VLS_ctx.cls) },
});
(__VLS_ctx.label);
/** @type {__VLS_StyleScopedClasses['profit-badge']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            label: label,
            cls: cls,
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
