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
};
