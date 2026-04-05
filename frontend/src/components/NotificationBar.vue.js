import { computed, onMounted } from "vue";
import { useNotificationStore } from "../stores/notification";
const notificationStore = useNotificationStore();
const notifications = computed(() => notificationStore.items);
const dismiss = (id) => {
    notificationStore.remove(id);
};
onMounted(() => {
    if (notificationStore.permission === "default") {
        notificationStore.requestPermission();
    }
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
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
