import { defineStore } from "pinia";
import { holdingsApi } from "../api/modules/holdings";
import type { HoldingItem } from "../types/api";

interface HoldingsState {
  items: HoldingItem[];
  loading: boolean;
  submitting: boolean;
  error: string;
}

export const useHoldingsStore = defineStore("holdings", {
  state: (): HoldingsState => ({
    items: [],
    loading: false,
    submitting: false,
    error: "",
  }),
  actions: {
    async fetchList(includeSold = false) {
      this.loading = true;
      this.error = "";
      try {
        const resp = await holdingsApi.list(includeSold);
        this.items = resp.data.items;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "加载持仓失败";
      } finally {
        this.loading = false;
      }
    },
    async create(payload: {
      ammo_id: string;
      purchase_price: number;
      threshold_pct?: number;
      purchased_at?: string;
    }) {
      this.submitting = true;
      try {
        await holdingsApi.create(payload);
      } finally {
        this.submitting = false;
      }
    },
    async update(holdingId: number, payload: { purchase_price?: number; threshold_pct?: number }) {
      this.submitting = true;
      try {
        await holdingsApi.update(holdingId, payload);
      } finally {
        this.submitting = false;
      }
    },
    async markSold(holdingId: number) {
      this.submitting = true;
      try {
        await holdingsApi.markSold(holdingId);
      } finally {
        this.submitting = false;
      }
    },
    async remove(holdingId: number) {
      this.submitting = true;
      try {
        await holdingsApi.remove(holdingId);
      } finally {
        this.submitting = false;
      }
    },
  },
});
