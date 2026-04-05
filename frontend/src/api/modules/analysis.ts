import { request } from "../client";
import type { AnalysisConfigData, AnalysisData, ApiResponse } from "../../types/api";

interface RunAnalysisPayload {
  ammo_id: string;
  days: number;
  force_refresh: boolean;
}

export const analysisApi = {
  getConfig() {
    return request<ApiResponse<AnalysisConfigData>>({
      url: "/api/analysis/config",
      method: "GET",
    });
  },
  updateConfig(payload: Partial<AnalysisConfigData>) {
    return request<ApiResponse<AnalysisConfigData>>(
      {
        url: "/api/analysis/config",
        method: "PUT",
        data: payload,
      },
      { retry: 0 }
    );
  },
  runAnalysis(payload: RunAnalysisPayload) {
    return request<ApiResponse<AnalysisData>>(
      {
        url: "/api/analysis/run",
        method: "POST",
        data: payload,
      },
      { retry: 1 }
    );
  },
};
