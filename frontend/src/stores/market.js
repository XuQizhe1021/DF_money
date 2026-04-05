import { defineStore } from "pinia";
import { marketApi } from "../api/modules/market";
export const useMarketStore = defineStore("market", {
    state: () => ({
        latestItems: [],
        historyItems: [],
        loadingLatest: false,
        loadingHistory: false,
        errorLatest: "",
        errorHistory: "",
        updatedAt: "",
    }),
    getters: {
        ammoOptions: (state) => state.latestItems.map((item) => ({
            label: `${item.name} (${item.id})`,
            value: item.id,
        })),
    },
    actions: {
        async fetchLatest() {
            this.loadingLatest = true;
            this.errorLatest = "";
            try {
                const resp = await marketApi.getLatest();
                this.latestItems = resp.data.items;
                this.updatedAt = new Date().toISOString();
            }
            catch (error) {
                this.errorLatest = error instanceof Error ? error.message : "获取行情失败";
            }
            finally {
                this.loadingLatest = false;
            }
        },
        async fetchHistory(ammoId, days) {
            this.loadingHistory = true;
            this.errorHistory = "";
            try {
                const resp = await marketApi.getHistory(ammoId, days);
                this.historyItems = resp.data.items;
            }
            catch (error) {
                this.errorHistory = error instanceof Error ? error.message : "获取历史数据失败";
                this.historyItems = [];
            }
            finally {
                this.loadingHistory = false;
            }
        },
    },
});
