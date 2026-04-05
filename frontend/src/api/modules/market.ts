import { request } from "../client";
import type { ApiResponse, AmmoLatestData, HistoryData } from "../../types/api";

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
};
