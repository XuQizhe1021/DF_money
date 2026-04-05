import { request } from "../client";
export const analysisApi = {
    getConfig() {
        return request({
            url: "/api/analysis/config",
            method: "GET",
        });
    },
    updateConfig(payload) {
        return request({
            url: "/api/analysis/config",
            method: "PUT",
            data: payload,
        }, { retry: 0 });
    },
    runAnalysis(payload) {
        return request({
            url: "/api/analysis/run",
            method: "POST",
            data: payload,
        }, { retry: 1 });
    },
    getLatestDailySignal() {
        return request({
            url: "/api/analysis/daily-signal/latest",
            method: "GET",
        });
    },
    confirmDailySignal(eventId) {
        return request({
            url: "/api/analysis/daily-signal/confirm",
            method: "POST",
            data: { event_id: eventId },
        }, { retry: 0 });
    },
    runDailySignalNow() {
        return request({
            url: "/api/analysis/daily-signal/run",
            method: "POST",
        }, { retry: 0 });
    },
};
