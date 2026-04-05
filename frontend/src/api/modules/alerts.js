import { request } from "../client";
export const alertsApi = {
    getConfig() {
        return request({
            url: "/api/alerts/config",
            method: "GET",
        });
    },
    evaluate() {
        return request({
            url: "/api/alerts/evaluate",
            method: "POST",
        });
    },
    getEvents(unreadOnly = true) {
        return request({
            url: "/api/alerts/events",
            method: "GET",
            params: {
                unread_only: unreadOnly,
            },
        });
    },
    markRead(eventIds) {
        return request({
            url: "/api/alerts/read",
            method: "POST",
            data: {
                event_ids: eventIds,
            },
        });
    },
};
