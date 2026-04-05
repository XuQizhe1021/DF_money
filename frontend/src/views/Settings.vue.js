import { onMounted, reactive, ref } from "vue";
import { analysisApi } from "../api/modules/analysis";
import { settingsApi } from "../api/modules/settings";
import { useNotificationStore } from "../stores/notification";
const notificationStore = useNotificationStore();
const loading = ref(false);
const saving = ref(false);
const section = ref("agent");
const cleanupDate = ref("");
const cleaning = ref(false);
const aiForm = reactive({
    enabled: true,
    base_url: "",
    model: "",
    api_key: "",
    timeout_seconds: 12,
    max_calls_per_hour: 5,
    cache_ttl_seconds: 1800,
    daily_signal_enabled: true,
    daily_signal_hour: 20,
});
const dsForm = reactive({
    api_base_url: "",
    api_ammo_endpoint: "",
    openid: "",
    access_token: "",
    fetch_interval_hours: 1,
    has_openid: false,
    has_access_token: false,
});
const loadConfig = async () => {
    loading.value = true;
    try {
        const [aiResp, dsResp] = await Promise.all([analysisApi.getConfig(), settingsApi.getDataSourceConfig()]);
        aiForm.enabled = !!aiResp.data.enabled;
        aiForm.base_url = aiResp.data.base_url || "";
        aiForm.model = aiResp.data.model || "";
        aiForm.api_key = "";
        aiForm.timeout_seconds = Number(aiResp.data.timeout_seconds || 12);
        aiForm.max_calls_per_hour = Number(aiResp.data.max_calls_per_hour || 5);
        aiForm.cache_ttl_seconds = Number(aiResp.data.cache_ttl_seconds || 1800);
        aiForm.daily_signal_enabled = !!aiResp.data.daily_signal_enabled;
        aiForm.daily_signal_hour = Number(aiResp.data.daily_signal_hour ?? 20);
        dsForm.api_base_url = dsResp.data.api_base_url || "";
        dsForm.api_ammo_endpoint = dsResp.data.api_ammo_endpoint || "";
        dsForm.openid = "";
        dsForm.access_token = "";
        dsForm.fetch_interval_hours = Number(dsResp.data.fetch_interval_hours || 1);
        dsForm.has_openid = !!dsResp.data.has_openid;
        dsForm.has_access_token = !!dsResp.data.has_access_token;
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "配置加载失败");
    }
    finally {
        loading.value = false;
    }
};
const saveAgentConfig = async () => {
    saving.value = true;
    try {
        await analysisApi.updateConfig({
            enabled: aiForm.enabled,
            base_url: aiForm.base_url,
            model: aiForm.model,
            timeout_seconds: aiForm.timeout_seconds,
            max_calls_per_hour: aiForm.max_calls_per_hour,
            cache_ttl_seconds: aiForm.cache_ttl_seconds,
            daily_signal_enabled: aiForm.daily_signal_enabled,
            daily_signal_hour: aiForm.daily_signal_hour,
            ...(aiForm.api_key ? { api_key: aiForm.api_key } : {}),
        });
        aiForm.api_key = "";
        notificationStore.push("success", "智能体配置已保存");
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "智能体配置保存失败");
    }
    finally {
        saving.value = false;
    }
};
const saveDataSourceConfig = async () => {
    saving.value = true;
    try {
        const resp = await settingsApi.updateDataSourceConfig({
            api_base_url: dsForm.api_base_url,
            api_ammo_endpoint: dsForm.api_ammo_endpoint,
            fetch_interval_hours: dsForm.fetch_interval_hours,
            ...(dsForm.openid ? { openid: dsForm.openid } : {}),
            ...(dsForm.access_token ? { access_token: dsForm.access_token } : {}),
        });
        dsForm.openid = "";
        dsForm.access_token = "";
        dsForm.has_openid = !!resp.data.has_openid;
        dsForm.has_access_token = !!resp.data.has_access_token;
        notificationStore.push("success", "数据源配置已保存");
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "数据源配置保存失败");
    }
    finally {
        saving.value = false;
    }
};
const cleanupHistory = async (mode) => {
    cleaning.value = true;
    try {
        const payload = mode === "before_date" ? { mode, date: cleanupDate.value } : { mode };
        const resp = await settingsApi.cleanupHistory(payload);
        notificationStore.push("success", `历史数据清理完成，删除 ${resp.data.deleted_count} 条`);
    }
    catch (error) {
        notificationStore.push("error", error instanceof Error ? error.message : "历史数据清理失败");
    }
    finally {
        cleaning.value = false;
    }
};
onMounted(async () => {
    await loadConfig();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "stack" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.section = 'datasource';
        } },
    ...{ class: "btn" },
    ...{ class: ({ ghost: __VLS_ctx.section !== 'datasource' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.section = 'agent';
        } },
    ...{ class: "btn" },
    ...{ class: ({ ghost: __VLS_ctx.section !== 'agent' }) },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card" },
    });
}
else if (__VLS_ctx.section === 'datasource') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "例如：https://xxx.com",
    });
    (__VLS_ctx.dsForm.api_base_url);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "例如：/api/ammo/prices",
    });
    (__VLS_ctx.dsForm.api_ammo_endpoint);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "粘贴你的openid（可选）",
    });
    (__VLS_ctx.dsForm.openid);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "粘贴你的access_token（可选）",
    });
    (__VLS_ctx.dsForm.access_token);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "1",
        max: "168",
    });
    (__VLS_ctx.dsForm.fetch_interval_hours);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "subline" },
    });
    (__VLS_ctx.dsForm.has_openid ? "已配置" : "未配置");
    (__VLS_ctx.dsForm.has_access_token ? "已配置" : "未配置");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveDataSourceConfig) },
        ...{ class: "btn" },
        disabled: (__VLS_ctx.saving),
    });
    (__VLS_ctx.saving ? "保存中..." : "保存数据源配置");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.section === 'datasource'))
                    return;
                __VLS_ctx.cleanupHistory('before_7_days');
            } },
        ...{ class: "btn danger" },
        disabled: (__VLS_ctx.cleaning),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.section === 'datasource'))
                    return;
                __VLS_ctx.cleanupHistory('before_30_days');
            } },
        ...{ class: "btn danger" },
        disabled: (__VLS_ctx.cleaning),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.section === 'datasource'))
                    return;
                __VLS_ctx.cleanupHistory('before_today');
            } },
        ...{ class: "btn danger" },
        disabled: (__VLS_ctx.cleaning),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "例如：2026-03-01",
    });
    (__VLS_ctx.cleanupDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.loading))
                    return;
                if (!(__VLS_ctx.section === 'datasource'))
                    return;
                __VLS_ctx.cleanupHistory('before_date');
            } },
        ...{ class: "btn danger" },
        disabled: (__VLS_ctx.cleaning || !__VLS_ctx.cleanupDate),
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.aiForm.enabled),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (true),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (false),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "例如：https://api.deepseek.com",
    });
    (__VLS_ctx.aiForm.base_url);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "例如：deepseek-chat",
    });
    (__VLS_ctx.aiForm.model);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "仅在你要更新时填写",
    });
    (__VLS_ctx.aiForm.api_key);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "1",
        max: "120",
    });
    (__VLS_ctx.aiForm.timeout_seconds);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "1",
        max: "120",
    });
    (__VLS_ctx.aiForm.max_calls_per_hour);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "10",
        max: "86400",
    });
    (__VLS_ctx.aiForm.cache_ttl_seconds);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.aiForm.daily_signal_enabled),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (true),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (false),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        max: "23",
    });
    (__VLS_ctx.aiForm.daily_signal_hour);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAgentConfig) },
        ...{ class: "btn" },
        disabled: (__VLS_ctx.saving),
    });
    (__VLS_ctx.saving ? "保存中..." : "保存智能体配置");
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card stack" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['subline']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['stack']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            saving: saving,
            section: section,
            cleanupDate: cleanupDate,
            cleaning: cleaning,
            aiForm: aiForm,
            dsForm: dsForm,
            saveAgentConfig: saveAgentConfig,
            saveDataSourceConfig: saveDataSourceConfig,
            cleanupHistory: cleanupHistory,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
