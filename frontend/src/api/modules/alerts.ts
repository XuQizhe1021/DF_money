import { request } from "../client";
import type {
  AlertConfigData,
  AlertEventsData,
  ApiResponse,
  AlertEventItem,
} from "../../types/api";

export const alertsApi = {
  getConfig() {
    return request<ApiResponse<AlertConfigData>>({
      url: "/api/alerts/config",
      method: "GET",
    });
  },
  evaluate() {
    return request<ApiResponse<{ checked: number; triggered: number; events: AlertEventItem[] }>>(
      {
        url: "/api/alerts/evaluate",
        method: "POST",
      }
    );
  },
  getEvents(unreadOnly = true) {
    return request<ApiResponse<AlertEventsData>>({
      url: "/api/alerts/events",
      method: "GET",
      params: {
        unread_only: unreadOnly,
      },
    });
  },
  markRead(eventIds?: number[]) {
    return request<ApiResponse<{ updated: number }>>({
      url: "/api/alerts/read",
      method: "POST",
      data: {
        event_ids: eventIds,
      },
    });
  },
};
