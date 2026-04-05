import { request } from "../client";
export const analysisApi = {
    runAnalysis(payload) {
        return request({
            url: "/api/analysis/run",
            method: "POST",
            data: payload,
        }, { retry: 1 });
    },
};
