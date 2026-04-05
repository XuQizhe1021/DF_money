import { defineStore } from "pinia";
export const useNotificationStore = defineStore("notification", {
    state: () => ({
        items: [],
        permission: Notification.permission,
    }),
    actions: {
        push(type, message) {
            const item = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                type,
                message,
                createdAt: Date.now(),
            };
            this.items.unshift(item);
            if (this.items.length > 5) {
                this.items = this.items.slice(0, 5);
            }
            return item.id;
        },
        remove(id) {
            this.items = this.items.filter((item) => item.id !== id);
        },
        clear() {
            this.items = [];
        },
        async requestPermission() {
            if (!("Notification" in window)) {
                this.permission = "denied";
                return this.permission;
            }
            this.permission = await Notification.requestPermission();
            return this.permission;
        },
        sendBrowserNotification(title, body) {
            if (!("Notification" in window)) {
                return;
            }
            if (this.permission === "granted") {
                new Notification(title, { body });
            }
        },
    },
});
