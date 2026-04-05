import { request } from "../client";
import type { ApiResponse, DataSourceConfigData } from "../../types/api";

interface UpdateDataSourcePayload {
  api_base_url?: string;
  api_ammo_endpoint?: string;
  openid?: string;
  access_token?: string;
  fetch_interval_hours?: number;
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
};
