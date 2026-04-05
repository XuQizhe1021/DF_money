import { computed, onMounted, reactive, ref } from "vue";
import ProfitBadge from "../components/ProfitBadge.vue";
import { useHoldingsStore } from "../stores/holdings";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";
const holdingsStore = useHoldingsStore();
const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const includeSold = ref(false);
const editingId = ref(null);
const form = reactive({
    ammo_id: "",
    purchase_price: "",
    threshold_pct: "0.15",
});
const editForm = reactive({
    purchase_price: "",
    threshold_pct: "",
});
const formError = ref("");
const isSubmitLocked = computed(() => holdingsStore.submitting);
const validatePrice = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0;
};
const validateThreshold = (value) => {
    if (!value) {
        return true;
    }
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 && num <= 10;
};
const loadData = async () => {
    await Promise.all([holdingsStore.fetchList(includeSold.value), marketStore.fetchLatest()]);
    if (holdingsStore.error) {
        notificationStore.push("error", holdingsStore.error);
    }
};
const createHolding = async () => {
    formError.value = "";
    if (!form.ammo_id) {
        formError.value = "请选择子弹";
        return;
    }
    if (!validatePrice(form.purchase_price)) {
        formError.value = "购买价格必须是大于等于0的数字";
        return;
    }
    if (!validateThreshold(form.threshold_pct)) {
        formError.value = "阈值必须在0~10之间";
        return;
    }
    if (isSubmitLocked.value) {
        return;
    }
    try {
        await holdingsStore.create({
            ammo_id: form.ammo_id,
            purchase_price: Number(form.purchase_price),
            threshold_pct: form.threshold_pct ? Number(form.threshold_pct) : undefined,
        });
        await holdingsStore.fetchList(includeSold.value);
        notificationStore.push("success", "持仓新增成功");
        form.purchase_price = "";
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "新增失败");
    }
};
const startEdit = (id, purchasePrice, thresholdPct) => {
    editingId.value = id;
    editForm.purchase_price = String(purchasePrice);
    editForm.threshold_pct = thresholdPct === null ? "" : String(thresholdPct);
};
const saveEdit = async (id) => {
    if (!validatePrice(editForm.purchase_price) || !validateThreshold(editForm.threshold_pct)) {
        notificationStore.push("error", "编辑参数不合法");
        return;
    }
    if (isSubmitLocked.value) {
        return;
    }
    try {
        await holdingsStore.update(id, {
            purchase_price: Number(editForm.purchase_price),
            threshold_pct: editForm.threshold_pct ? Number(editForm.threshold_pct) : undefined,
        });
        editingId.value = null;
        await holdingsStore.fetchList(includeSold.value);
        notificationStore.push("success", "持仓更新成功");
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "更新失败");
    }
};
const markSold = async (id) => {
    if (isSubmitLocked.value) {
        return;
    }
    try {
        await holdingsStore.markSold(id);
        await holdingsStore.fetchList(includeSold.value);
        notificationStore.push("success", "已标记卖出");
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "操作失败");
    }
};
const remove = async (id) => {
    if (isSubmitLocked.value) {
        return;
    }
    try {
        await holdingsStore.remove(id);
        await holdingsStore.fetchList(includeSold.value);
        notificationStore.push("success", "持仓已删除");
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "删除失败");
    }
};
onMounted(async () => {
    await loadData();
    form.ammo_id = marketStore.latestItems[0]?.id ?? "";
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "stack" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card stack" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.form.ammo_id),
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    step: "0.01",
});
(__VLS_ctx.form.purchase_price);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    max: "10",
    step: "0.01",
});
(__VLS_ctx.form.threshold_pct);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createHolding) },
    ...{ class: "btn" },
    disabled: (__VLS_ctx.isSubmitLocked),
});
(__VLS_ctx.holdingsStore.submitting ? "提交中..." : "新增持仓");
if (__VLS_ctx.formError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-text" },
    });
    (__VLS_ctx.formError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.loadData) },
    type: "checkbox",
});
(__VLS_ctx.includeSold);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadData) },
    ...{ class: "btn" },
    disabled: (__VLS_ctx.holdingsStore.loading),
});
(__VLS_ctx.holdingsStore.loading ? "加载中..." : "刷新列表");
if (__VLS_ctx.holdingsStore.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else if (__VLS_ctx.holdingsStore.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card error" },
    });
    (__VLS_ctx.holdingsStore.error);
}
else if (__VLS_ctx.holdingsStore.items.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card table-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.holdingsStore.items))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.ammo_name);
        (item.ammo_id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (__VLS_ctx.editingId === item.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                min: "0",
                step: "0.01",
            });
            (__VLS_ctx.editForm.purchase_price);
        }
        else {
            (item.purchase_price.toFixed(2));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.latest_price === null ? "-" : item.latest_price.toFixed(2));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        /** @type {[typeof ProfitBadge, ]} */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(ProfitBadge, new ProfitBadge({
            ratio: (item.pnl_ratio),
        }));
        const __VLS_1 = __VLS_0({
            ratio: (item.pnl_ratio),
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "row" },
        });
        if (__VLS_ctx.editingId === item.id) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "number",
                min: "0",
                max: "10",
                step: "0.01",
                placeholder: "阈值",
            });
            (__VLS_ctx.editForm.threshold_pct);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.holdingsStore.loading))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.error))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.items.length === 0))
                            return;
                        if (!(__VLS_ctx.editingId === item.id))
                            return;
                        __VLS_ctx.saveEdit(item.id);
                    } },
                ...{ class: "btn" },
                disabled: (__VLS_ctx.isSubmitLocked),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.holdingsStore.loading))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.error))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.items.length === 0))
                            return;
                        if (!(__VLS_ctx.editingId === item.id))
                            return;
                        __VLS_ctx.editingId = null;
                    } },
                ...{ class: "btn ghost" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.holdingsStore.loading))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.error))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.items.length === 0))
                            return;
                        if (!!(__VLS_ctx.editingId === item.id))
                            return;
                        __VLS_ctx.startEdit(item.id, item.purchase_price, item.threshold_pct);
                    } },
                ...{ class: "btn ghost" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.holdingsStore.loading))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.error))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.items.length === 0))
                            return;
                        if (!!(__VLS_ctx.editingId === item.id))
                            return;
                        __VLS_ctx.markSold(item.id);
                    } },
                ...{ class: "btn ghost" },
                disabled: (__VLS_ctx.isSubmitLocked),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.holdingsStore.loading))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.error))
                            return;
                        if (!!(__VLS_ctx.holdingsStore.items.length === 0))
                            return;
                        if (!!(__VLS_ctx.editingId === item.id))
                            return;
                        __VLS_ctx.remove(item.id);
                    } },
                ...{ class: "btn danger" },
                disabled: (__VLS_ctx.isSubmitLocked),
            });
        }
    }
}
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['table-card']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ProfitBadge: ProfitBadge,
            holdingsStore: holdingsStore,
            marketStore: marketStore,
            includeSold: includeSold,
            editingId: editingId,
            form: form,
            editForm: editForm,
            formError: formError,
            isSubmitLocked: isSubmitLocked,
            loadData: loadData,
            createHolding: createHolding,
            startEdit: startEdit,
            saveEdit: saveEdit,
            markSold: markSold,
            remove: remove,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
