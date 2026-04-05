<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { analysisApi } from "../api/modules/analysis";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";
import type { AnalysisData } from "../types/api";

const marketStore = useMarketStore();
const notificationStore = useNotificationStore();

const selectedAmmoId = ref("");
const selectedDays = ref<7 | 30>(7);
const result = ref<AnalysisData | null>(null);
const loading = ref(false);
const error = ref("");

const canRun = computed(() => !!selectedAmmoId.value && !loading.value);
const riskClass = computed(() => {
  const level = result.value?.result.risk_level ?? "";
  if (level.includes("高")) {
    return "risk-high";
  }
  if (level.includes("中")) {
    return "risk-medium";
  }
  return "risk-low";
});

const runAnalysis = async () => {
  if (!canRun.value) {
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const resp = await analysisApi.runAnalysis({
      ammo_id: selectedAmmoId.value,
      days: selectedDays.value,
      force_refresh: true,
    });
    result.value = resp.data;
    notificationStore.push("success", "AI分析完成");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "分析失败";
    result.value = null;
    notificationStore.push("error", error.value);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (marketStore.latestItems.length === 0) {
    await marketStore.fetchLatest();
  }
  selectedAmmoId.value = marketStore.latestItems[0]?.id ?? "";
});
</script>

<template>
  <section class="stack">
    <div class="card row">
      <label>
        子弹
        <select v-model="selectedAmmoId">
          <option value="" disabled>请选择子弹</option>
          <option v-for="item in marketStore.ammoOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label>
        分析窗口
        <select v-model.number="selectedDays">
          <option :value="7">近7日</option>
          <option :value="30">近30日</option>
        </select>
      </label>
      <button class="btn" :disabled="!canRun" @click="runAnalysis">
        {{ loading ? "分析中..." : "触发分析" }}
      </button>
    </div>

    <div v-if="loading" class="card">AI分析执行中...</div>
    <div v-else-if="error" class="card error">{{ error }}</div>
    <div v-else-if="!result" class="card">暂无分析结果，请先触发分析</div>
    <div v-else class="card stack">
      <p><strong>价格位置：</strong>{{ result.result.price_position }}</p>
      <p><strong>操作建议：</strong>{{ result.result.action }}</p>
      <p>
        <strong>风险等级：</strong>
        <span class="risk-tag" :class="riskClass">{{ result.result.risk_level }}</span>
      </p>
      <p><strong>原因：</strong>{{ result.result.reason }}</p>
      <p><strong>风险提示：</strong>{{ result.result.risk_tips.join("；") || "无" }}</p>
    </div>
  </section>
</template>
