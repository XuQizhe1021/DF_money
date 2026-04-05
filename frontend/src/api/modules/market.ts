import { request } from "../client";
import type { ApiResponse, AmmoLatestData, ChangeRankingData, HistoryData } from "../../types/api";

export const marketApi = {
  getLatest() {
    return request<ApiResponse<AmmoLatestData>>(
      {
        url: "/api/ammo/latest",
        method: "GET",
      },
      { retry: 2 }
    );
  },
  getHistory(ammoId: string, days: number) {
    return request<ApiResponse<HistoryData>>(
      {
        url: `/api/ammo/${encodeURIComponent(ammoId)}/history`,
        method: "GET",
        params: { days },
      },
      { retry: 2 }
    );
  },
  getChangeRanking(days = 7, limit = 3) {
    return request<ApiResponse<ChangeRankingData>>(
      {
        url: "/api/ammo/change-ranking",
        method: "GET",
        params: { days, limit },
      },
      { retry: 1 }
    );
  },
};
