import { defineStore } from "pinia";
import { holdingsApi } from "../api/modules/holdings";
export const useHoldingsStore = defineStore("holdings", {
    state: () => ({
        items: [],
        loading: false,
        submitting: false,
        error: "",
        page: 1,
        pageSize: 100,
    }),
    actions: {
        async fetchList(includeSold = false, page, pageSize) {
            this.loading = true;
            this.error = "";
            const resolvedPage = page ?? this.page;
            const resolvedPageSize = pageSize ?? this.pageSize;
            this.page = Math.max(1, resolvedPage);
            this.pageSize = Math.max(1, Math.min(resolvedPageSize, 200));
            try {
                const offset = (this.page - 1) * this.pageSize;
                const resp = await holdingsApi.list(includeSold, this.pageSize, offset);
                this.items = resp.data.items;
            }
            catch (error) {
                this.error = error instanceof Error ? error.message : "加载持仓失败";
            }
            finally {
                this.loading = false;
            }
        },
        async create(payload) {
            this.submitting = true;
            try {
                await holdingsApi.create(payload);
            }
            finally {
                this.submitting = false;
            }
        },
        async update(holdingId, payload) {
            this.submitting = true;
            try {
                await holdingsApi.update(holdingId, payload);
            }
            finally {
                this.submitting = false;
            }
        },
        async markSold(holdingId) {
            this.submitting = true;
            try {
                await holdingsApi.markSold(holdingId);
            }
            finally {
                this.submitting = false;
            }
        },
        async remove(holdingId) {
            this.submitting = true;
            try {
                await holdingsApi.remove(holdingId);
            }
            finally {
                this.submitting = false;
            }
        },
    },
});
