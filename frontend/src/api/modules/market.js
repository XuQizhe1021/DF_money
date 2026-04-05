import { request } from "../client";
export const marketApi = {
    getLatest() {
        return request({
            url: "/api/ammo/latest",
            method: "GET",
        }, { retry: 2 });
    },
    getHistory(ammoId, days) {
        return request({
            url: `/api/ammo/${encodeURIComponent(ammoId)}/history`,
            method: "GET",
            params: { days },
        }, { retry: 2 });
    },
};
