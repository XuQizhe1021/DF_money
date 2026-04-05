import { computed, onMounted, ref } from "vue";
import { analysisApi } from "../api/modules/analysis";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";
const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const selectedAmmoId = ref("");
const selectedDays = ref(7);
const result = ref(null);
const loading = ref(false);
const error = ref("");
const canRun = computed(() => !!selectedAmmoId.value && !loading.value);
const renderMarkdown = (text) => {
    const source = text || "";
    const escaped = source
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return escaped
        .replace(/^###\s+(.+)$/gm, "<h4>$1</h4>")
        .replace(/^##\s+(.+)$/gm, "<h3>$1</h3>")
        .replace(/^#\s+(.+)$/gm, "<h2>$1</h2>")
        .replace(/^\-\s+(.+)$/gm, "<li>$1</li>")
        .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br>");
};
const reasonMarkdownHtml = computed(() => {
    const markdown = result.value?.result.reason_markdown || result.value?.result.reason || "";
    const body = renderMarkdown(markdown);
    return `<div class="markdown-body"><p>${body}</p></div>`;
});
const riskClass = computed(() => {
    const level = result.value?.result.risk_level ?? "";
    if (level.includes("高")) {
        return "risk-high";
    }
    if (level.includes("中")) {
        return "risk-medium";
    }
    return "risk-low";
});
const runAnalysis = async () => {
    if (!canRun.value) {
        return;
    }
    loading.value = true;
    error.value = "";
    try {
        const resp = await analysisApi.runAnalysis({
            ammo_id: selectedAmmoId.value,
            days: selectedDays.value,
            force_refresh: true,
        });
        result.value = resp.data;
        notificationStore.push("success", "AI分析完成");
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : "分析失败";
        result.value = null;
        notificationStore.push("error", error.value);
    }
    finally {
        loading.value = false;
    }
};
onMounted(async () => {
    if (marketStore.latestItems.length === 0) {
        await marketStore.fetchLatest();
    }
    selectedAmmoId.value = marketStore.latestItems[0]?.id ?? "";
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
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.marketStore.ammoOptions))) {
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
    ...{ onClick: (__VLS_ctx.runAnalysis) },
    ...{ class: "btn" },
    disabled: (!__VLS_ctx.canRun),
});
(__VLS_ctx.loading ? "分析中..." : "触发分析");
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card error" },
    });
    (__VLS_ctx.error);
}
else if (!__VLS_ctx.result) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.result.result.price_position);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.result.result.action);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "risk-tag" },
        ...{ class: (__VLS_ctx.riskClass) },
    });
    (__VLS_ctx.result.result.risk_level);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.result.result.reason);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.result.result.risk_tips.join("；") || "无");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.reasonMarkdownHtml) }, null, null);
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
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['risk-tag']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            marketStore: marketStore,
            selectedAmmoId: selectedAmmoId,
            selectedDays: selectedDays,
            result: result,
            loading: loading,
            error: error,
            canRun: canRun,
            reasonMarkdownHtml: reasonMarkdownHtml,
            riskClass: riskClass,
            runAnalysis: runAnalysis,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
