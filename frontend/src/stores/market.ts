import { defineStore } from "pinia";
import { marketApi } from "../api/modules/market";
import type { AmmoLatestItem, HistoryItem } from "../types/api";

interface MarketState {
  latestItems: AmmoLatestItem[];
  historyItems: HistoryItem[];
  loadingLatest: boolean;
  loadingHistory: boolean;
  errorLatest: string;
  errorHistory: string;
  updatedAt: string;
  historyCache: Record<string, { items: HistoryItem[]; savedAt: number }>;
}

export const useMarketStore = defineStore("market", {
  state: (): MarketState => ({
    latestItems: [],
    historyItems: [],
    loadingLatest: false,
    loadingHistory: false,
    errorLatest: "",
    errorHistory: "",
    updatedAt: "",
    historyCache: {},
  }),
  getters: {
    ammoOptions: (state) =>
      state.latestItems.map((item) => ({
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
      } catch (error) {
        this.errorLatest = error instanceof Error ? error.message : "获取行情失败";
      } finally {
        this.loadingLatest = false;
      }
    },
    async fetchHistory(ammoId: string, days: number, forceRefresh = false) {
      this.loadingHistory = true;
      this.errorHistory = "";
      const cacheKey = `${ammoId}:${days}`;
      try {
        // 历史数据短缓存：降低频繁切换筛选时的重复请求，提升图表响应速度。
        if (!forceRefresh) {
          const cached = this.historyCache[cacheKey];
          if (cached && Date.now() - cached.savedAt <= 30_000) {
            this.historyItems = cached.items;
            return;
          }
        }
        const resp = await marketApi.getHistory(ammoId, days);
        this.historyItems = resp.data.items;
        this.historyCache[cacheKey] = {
          items: resp.data.items,
          savedAt: Date.now(),
        };
      } catch (error) {
        this.errorHistory = error instanceof Error ? error.message : "获取历史数据失败";
        this.historyItems = [];
      } finally {
        this.loadingHistory = false;
      }
    },
  },
});
