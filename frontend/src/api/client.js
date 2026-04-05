import axios from "axios";
import { useNotificationStore } from "../stores/notification";
const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isRetryable = (error) => {
    if (!error.response) {
        return true;
    }
    return error.response.status >= 500;
};
const normalizeErrorMessage = (error) => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        return data?.message || error.message || "请求失败";
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "请求失败";
};
export async function request(config, options = {}) {
    const retryTimes = options.retry ?? 1;
    const retryDelayMs = options.retryDelayMs ?? 500;
    const timeout = options.timeoutMs ?? 10000;
    let attempt = 0;
    let lastError;
    // 统一请求入口：超时、重试、异常归一化都在此处理，避免页面重复实现。
    while (attempt <= retryTimes) {
        try {
            const response = await client.request({
                ...config,
                timeout,
            });
            return response.data;
        }
        catch (error) {
            lastError = error;
            if (!axios.isAxiosError(error)) {
                break;
            }
            if (attempt >= retryTimes || !isRetryable(error)) {
                break;
            }
            // 使用线性退避降低接口抖动时的瞬时请求压力。
            await sleep(retryDelayMs * (attempt + 1));
        }
        attempt += 1;
    }
    const message = normalizeErrorMessage(lastError);
    const notificationStore = useNotificationStore();
    notificationStore.push("error", message);
    throw new Error(message);
}
