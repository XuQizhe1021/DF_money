import { request } from "../client";
import type { ApiResponse, HoldingItem, HoldingListData } from "../../types/api";

interface CreateHoldingPayload {
  ammo_id: string;
  purchase_price: number;
  threshold_pct?: number;
  purchased_at?: string;
}

interface UpdateHoldingPayload {
  purchase_price?: number;
  threshold_pct?: number;
}

export const holdingsApi = {
  list(includeSold = false) {
    return request<ApiResponse<HoldingListData>>({
      url: "/api/holdings",
      method: "GET",
      params: {
        include_sold: includeSold,
      },
    });
  },
  create(payload: CreateHoldingPayload) {
    return request<ApiResponse<HoldingItem>>(
      {
        url: "/api/holdings",
        method: "POST",
        data: payload,
      },
      { retry: 0 }
    );
  },
  update(holdingId: number, payload: UpdateHoldingPayload) {
    return request<ApiResponse<HoldingItem>>(
      {
        url: `/api/holdings/${holdingId}`,
        method: "PATCH",
        data: payload,
      },
      { retry: 0 }
    );
  },
  markSold(holdingId: number) {
    return request<ApiResponse<HoldingItem>>({
      url: `/api/holdings/${holdingId}/sell`,
      method: "POST",
    });
  },
  remove(holdingId: number) {
    return request<ApiResponse<{ id: number }>>({
      url: `/api/holdings/${holdingId}`,
      method: "DELETE",
    });
  },
};
