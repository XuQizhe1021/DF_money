import { request } from "../client";
export const settingsApi = {
    getDataSourceConfig() {
        return request({
            url: "/api/settings/data-source",
            method: "GET",
        });
    },
    updateDataSourceConfig(payload) {
        return request({
            url: "/api/settings/data-source",
            method: "PUT",
            data: payload,
        }, { retry: 0 });
    },
    cleanupHistory(payload) {
        return request({
            url: "/api/settings/data-cleanup",
            method: "POST",
            data: payload,
        }, { retry: 0 });
    },
};
