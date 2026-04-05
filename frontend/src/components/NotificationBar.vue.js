import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useNotificationStore } from "../stores/notification";
const notificationStore = useNotificationStore();
const notifications = computed(() => notificationStore.items);
const timers = new Map();
const scheduleRemove = (id, delayMs = 5000) => {
    const oldTimer = timers.get(id);
    if (oldTimer) {
        window.clearTimeout(oldTimer);
    }
    const timer = window.setTimeout(() => {
        notificationStore.remove(id);
        timers.delete(id);
    }, delayMs);
    timers.set(id, timer);
};
const dismiss = (id) => {
    const timer = timers.get(id);
    if (timer) {
        window.clearTimeout(timer);
        timers.delete(id);
    }
    notificationStore.remove(id);
};
const onEnter = (id) => {
    const timer = timers.get(id);
    if (timer) {
        window.clearTimeout(timer);
        timers.delete(id);
    }
};
const onLeave = (id) => {
    scheduleRemove(id, 5000);
};
onMounted(() => {
    if (notificationStore.permission === "default") {
        notificationStore.requestPermission();
    }
});
onMounted(() => {
    notifications.value.forEach((item) => scheduleRemove(item.id, 5000));
});
watch(() => notifications.value.map((item) => item.id), (ids) => {
    ids.forEach((id) => {
        if (!timers.has(id)) {
            scheduleRemove(id, 5000);
        }
    });
    [...timers.keys()].forEach((id) => {
        if (!ids.includes(id)) {
            const timer = timers.get(id);
            if (timer) {
                window.clearTimeout(timer);
            }
            timers.delete(id);
        }
    });
});
onBeforeUnmount(() => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notification-wrapper" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.notifications))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onMouseenter: (...[$event]) => {
                __VLS_ctx.onEnter(item.id);
            } },
        ...{ onMouseleave: (...[$event]) => {
                __VLS_ctx.onLeave(item.id);
            } },
        key: (item.id),
        ...{ class: "notification-item" },
        ...{ class: (item.type) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.message);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.dismiss(item.id);
            } },
    });
}
/** @type {__VLS_StyleScopedClasses['notification-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['notification-item']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            notifications: notifications,
            dismiss: dismiss,
            onEnter: onEnter,
            onLeave: onLeave,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
