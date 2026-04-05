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
};
