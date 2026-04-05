import { request } from "../client";
import type { AnalysisConfigData, AnalysisData, ApiResponse, DailySignalEventData } from "../../types/api";

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
  getLatestDailySignal() {
    return request<ApiResponse<DailySignalEventData | null>>({
      url: "/api/analysis/daily-signal/latest",
      method: "GET",
    });
  },
  confirmDailySignal(eventId: number) {
    return request<ApiResponse<{ event_id: number }>>(
      {
        url: "/api/analysis/daily-signal/confirm",
        method: "POST",
        data: { event_id: eventId },
      },
      { retry: 0 }
    );
  },
  runDailySignalNow() {
    return request<ApiResponse<{ event: DailySignalEventData | null }>>(
      {
        url: "/api/analysis/daily-signal/run",
        method: "POST",
      },
      { retry: 0 }
    );
  },
};
