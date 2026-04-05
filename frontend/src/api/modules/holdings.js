import { request } from "../client";
export const holdingsApi = {
    list(includeSold = false) {
        return request({
            url: "/api/holdings",
            method: "GET",
            params: {
                include_sold: includeSold,
            },
        });
    },
    create(payload) {
        return request({
            url: "/api/holdings",
            method: "POST",
            data: payload,
        }, { retry: 0 });
    },
    update(holdingId, payload) {
        return request({
            url: `/api/holdings/${holdingId}`,
            method: "PATCH",
            data: payload,
        }, { retry: 0 });
    },
    markSold(holdingId) {
        return request({
            url: `/api/holdings/${holdingId}/sell`,
            method: "POST",
        });
    },
    remove(holdingId) {
        return request({
            url: `/api/holdings/${holdingId}`,
            method: "DELETE",
        });
    },
};
