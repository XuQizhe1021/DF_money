import { request } from "../client";
import type { ApiResponse, DataSourceConfigData } from "../../types/api";

interface UpdateDataSourcePayload {
  api_base_url?: string;
  api_ammo_endpoint?: string;
  openid?: string;
  access_token?: string;
  fetch_interval_hours?: number;
}

interface CleanupDataPayload {
  mode: "before_7_days" | "before_30_days" | "before_today" | "before_date";
  date?: string;
}

export const settingsApi = {
  getDataSourceConfig() {
    return request<ApiResponse<DataSourceConfigData>>({
      url: "/api/settings/data-source",
      method: "GET",
    });
  },
  updateDataSourceConfig(payload: UpdateDataSourcePayload) {
    return request<ApiResponse<DataSourceConfigData>>(
      {
        url: "/api/settings/data-source",
        method: "PUT",
        data: payload,
      },
      { retry: 0 }
    );
  },
  cleanupHistory(payload: CleanupDataPayload) {
    return request<ApiResponse<{ deleted_count: number; cutoff: string; mode: string }>>(
      {
        url: "/api/settings/data-cleanup",
        method: "POST",
        data: payload,
      },
      { retry: 0 }
    );
  },
};
