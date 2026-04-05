import { request } from "../client";
import type { AnalysisData, ApiResponse } from "../../types/api";

interface RunAnalysisPayload {
  ammo_id: string;
  days: number;
  force_refresh: boolean;
}

export const analysisApi = {
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
