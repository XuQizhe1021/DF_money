import { computed, onMounted, ref } from "vue";
import { alertsApi } from "../api/modules/alerts";
import { analysisApi } from "../api/modules/analysis";
import { marketApi } from "../api/modules/market";
import MarketOverviewCharts from "../components/MarketOverviewCharts.vue";
import PriceTable from "../components/PriceTable.vue";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";
const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const checkingAlerts = ref(false);
const changeLoading = ref(false);
const changeError = ref("");
const gainers = ref([]);
const losers = ref([]);
const tableSortBy = ref("price");
const tableSortOrder = ref("desc");
const signalLoading = ref(false);
const confirmingSignal = ref(false);
const signalEvent = ref(null);
const rankingHint = computed(() => {
    const values = [...gainers.value, ...losers.value].map((item) => Math.abs(item.pct));
    if (!values.length) {
        return "暂无可用历史数据";
    }
    if (values.every((value) => value < 0.0001)) {
        return "当前历史样本较少，涨跌幅可能接近0。保持连续采集后将更准确。";
    }
    return "";
});
const topGain = computed(() => {
    if (!marketStore.latestItems.length) {
        return null;
    }
    return [...marketStore.latestItems].sort((a, b) => b.price - a.price)[0];
});
const topLoss = computed(() => {
    if (!marketStore.latestItems.length) {
        return null;
    }
    return [...marketStore.latestItems].sort((a, b) => a.price - b.price)[0];
});
const refresh = async () => {
    await marketStore.fetchLatest();
    if (marketStore.errorLatest) {
        notificationStore.push("error", marketStore.errorLatest);
        return;
    }
    notificationStore.push("success", "行情已刷新");
    await loadChangeRanking();
};
const loadChangeRanking = async () => {
    changeLoading.value = true;
    changeError.value = "";
    try {
        // 改为后端聚合接口，避免前端N次历史请求导致的瀑布延时和压力放大。
        const resp = await marketApi.getChangeRanking(7, 3);
        gainers.value = resp.data.gainers.map((item) => ({
            ammoId: item.ammo_id,
            name: item.name,
            pct: Number(item.pct),
        }));
        losers.value = resp.data.losers.map((item) => ({
            ammoId: item.ammo_id,
            name: item.name,
            pct: Number(item.pct),
        }));
    }
    catch (error) {
        changeError.value = error instanceof Error ? error.message : "涨跌幅计算失败";
    }
    finally {
        changeLoading.value = false;
    }
};
const checkAlerts = async () => {
    if (checkingAlerts.value) {
        return;
    }
    checkingAlerts.value = true;
    try {
        await alertsApi.evaluate();
        const eventsResp = await alertsApi.getEvents(true);
        const events = eventsResp.data.items;
        if (!events.length) {
            notificationStore.push("info", "当前无新的提醒事件");
            return;
        }
        events.forEach((event) => {
            notificationStore.push("warning", event.message);
            notificationStore.sendBrowserNotification("价格提醒", event.message);
        });
        await alertsApi.markRead(events.map((item) => item.id));
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "提醒检查失败");
    }
    finally {
        checkingAlerts.value = false;
    }
};
const fetchDailySignal = async () => {
    signalLoading.value = true;
    try {
        const resp = await analysisApi.getLatestDailySignal();
        signalEvent.value = resp.data;
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "每日提醒读取失败");
    }
    finally {
        signalLoading.value = false;
    }
};
const confirmDailySignal = async () => {
    if (!signalEvent.value || confirmingSignal.value) {
        return;
    }
    confirmingSignal.value = true;
    try {
        await analysisApi.confirmDailySignal(signalEvent.value.id);
        signalEvent.value = null;
        notificationStore.push("success", "已确认每日提醒事件");
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "确认失败");
    }
    finally {
        confirmingSignal.value = false;
    }
};
onMounted(async () => {
    await refresh();
    await checkAlerts();
    await fetchDailySignal();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "stack" },
});
if (__VLS_ctx.signalLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else if (__VLS_ctx.signalEvent) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.signalEvent.title);
    (__VLS_ctx.signalEvent.level);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    (__VLS_ctx.signalEvent.message_markdown);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.confirmDailySignal) },
        ...{ class: "btn danger" },
        disabled: (__VLS_ctx.confirmingSignal),
    });
    (__VLS_ctx.confirmingSignal ? "确认中..." : "我已知晓并确认");
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (__VLS_ctx.topGain) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.topGain.name);
    (__VLS_ctx.topGain.price.toFixed(2));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (__VLS_ctx.topLoss) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.topLoss.name);
    (__VLS_ctx.topLoss.price.toFixed(2));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.marketStore.updatedAt || "-");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refresh) },
    ...{ class: "btn" },
    disabled: (__VLS_ctx.marketStore.loadingLatest),
});
(__VLS_ctx.marketStore.loadingLatest ? "加载中..." : "刷新行情");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.checkAlerts) },
    ...{ class: "btn ghost" },
    disabled: (__VLS_ctx.checkingAlerts),
});
(__VLS_ctx.checkingAlerts ? "检查中..." : "检查提醒");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (__VLS_ctx.changeLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else if (__VLS_ctx.changeError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error" },
    });
    (__VLS_ctx.changeError);
}
else if (__VLS_ctx.gainers.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.gainers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        key: (item.ammoId),
    });
    (item.name);
    ((item.pct * 100).toFixed(2));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (__VLS_ctx.changeLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else if (__VLS_ctx.changeError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error" },
    });
    (__VLS_ctx.changeError);
}
else if (__VLS_ctx.losers.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.losers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        key: (item.ammoId),
    });
    (item.name);
    ((item.pct * 100).toFixed(2));
}
if (__VLS_ctx.rankingHint) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
    (__VLS_ctx.rankingHint);
}
if (__VLS_ctx.marketStore.latestItems.length > 0) {
    /** @type {[typeof MarketOverviewCharts, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(MarketOverviewCharts, new MarketOverviewCharts({
        rows: (__VLS_ctx.marketStore.latestItems),
    }));
    const __VLS_1 = __VLS_0({
        rows: (__VLS_ctx.marketStore.latestItems),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
if (__VLS_ctx.marketStore.loadingLatest) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else if (__VLS_ctx.marketStore.errorLatest) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card error" },
    });
    (__VLS_ctx.marketStore.errorLatest);
}
else if (__VLS_ctx.marketStore.latestItems.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else {
    /** @type {[typeof PriceTable, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(PriceTable, new PriceTable({
        sortBy: (__VLS_ctx.tableSortBy),
        sortOrder: (__VLS_ctx.tableSortOrder),
        rows: (__VLS_ctx.marketStore.latestItems),
    }));
    const __VLS_4 = __VLS_3({
        sortBy: (__VLS_ctx.tableSortBy),
        sortOrder: (__VLS_ctx.tableSortOrder),
        rows: (__VLS_ctx.marketStore.latestItems),
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
}
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MarketOverviewCharts: MarketOverviewCharts,
            PriceTable: PriceTable,
            marketStore: marketStore,
            checkingAlerts: checkingAlerts,
            changeLoading: changeLoading,
            changeError: changeError,
            gainers: gainers,
            losers: losers,
            tableSortBy: tableSortBy,
            tableSortOrder: tableSortOrder,
            signalLoading: signalLoading,
            confirmingSignal: confirmingSignal,
            signalEvent: signalEvent,
            rankingHint: rankingHint,
            topGain: topGain,
            topLoss: topLoss,
            refresh: refresh,
            checkAlerts: checkAlerts,
            confirmDailySignal: confirmDailySignal,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
