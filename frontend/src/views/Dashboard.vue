<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { alertsApi } from "../api/modules/alerts";
import { marketApi } from "../api/modules/market";
import PriceTable from "../components/PriceTable.vue";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";

const marketStore = useMarketStore();
const notificationStore = useNotificationStore();
const checkingAlerts = ref(false);
const changeLoading = ref(false);
const changeError = ref("");
const gainers = ref<Array<{ ammoId: string; name: string; pct: number }>>([]);
const losers = ref<Array<{ ammoId: string; name: string; pct: number }>>([]);

const topGain = computed(() => {
  if (!marketStore.latestItems.length) {
    return null;
  }
  return [...marketStore.latestItems].sort((a, b) => b.price - a.price)[0];
});

const topLoss = computed(() => {
  if (!marketStore.latestItems.length) {
    return null;
  }
  return [...marketStore.latestItems].sort((a, b) => a.price - b.price)[0];
});

const refresh = async () => {
  await marketStore.fetchLatest();
  if (marketStore.errorLatest) {
    notificationStore.push("error", marketStore.errorLatest);
    return;
  }
  notificationStore.push("success", "行情已刷新");
  await loadChangeRanking();
};

const loadChangeRanking = async () => {
  changeLoading.value = true;
  changeError.value = "";
  try {
    // 改为后端聚合接口，避免前端N次历史请求导致的瀑布延时和压力放大。
    const resp = await marketApi.getChangeRanking(7, 3);
    gainers.value = resp.data.gainers.map((item) => ({
      ammoId: item.ammo_id,
      name: item.name,
      pct: Number(item.pct),
    }));
    losers.value = resp.data.losers.map((item) => ({
      ammoId: item.ammo_id,
      name: item.name,
      pct: Number(item.pct),
    }));
  } catch (error) {
    changeError.value = error instanceof Error ? error.message : "涨跌幅计算失败";
  } finally {
    changeLoading.value = false;
  }
};

const checkAlerts = async () => {
  if (checkingAlerts.value) {
    return;
  }
  checkingAlerts.value = true;
  try {
    await alertsApi.evaluate();
    const eventsResp = await alertsApi.getEvents(true);
    const events = eventsResp.data.items;
    if (!events.length) {
      notificationStore.push("info", "当前无新的提醒事件");
      return;
    }
    events.forEach((event) => {
      notificationStore.push("warning", event.message);
      notificationStore.sendBrowserNotification("价格提醒", event.message);
    });
    await alertsApi.markRead(events.map((item) => item.id));
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "提醒检查失败");
  } finally {
    checkingAlerts.value = false;
  }
};

onMounted(async () => {
  await refresh();
  await checkAlerts();
});
</script>

<template>
  <section class="stack">
    <div class="row">
      <div class="card">
        <h3>价格最高</h3>
        <p v-if="topGain">{{ topGain.name }} / {{ topGain.price.toFixed(2) }}</p>
        <p v-else>暂无数据</p>
      </div>
      <div class="card">
        <h3>价格最低</h3>
        <p v-if="topLoss">{{ topLoss.name }} / {{ topLoss.price.toFixed(2) }}</p>
        <p v-else>暂无数据</p>
      </div>
      <div class="card">
        <h3>更新时间</h3>
        <p>{{ marketStore.updatedAt || "-" }}</p>
      </div>
    </div>

    <div class="card actions">
      <button class="btn" :disabled="marketStore.loadingLatest" @click="refresh">
        {{ marketStore.loadingLatest ? "加载中..." : "刷新行情" }}
      </button>
      <button class="btn ghost" :disabled="checkingAlerts" @click="checkAlerts">
        {{ checkingAlerts ? "检查中..." : "检查提醒" }}
      </button>
    </div>

    <div class="row">
      <div class="card">
        <h3>7日涨幅Top3</h3>
        <p v-if="changeLoading">计算中...</p>
        <p v-else-if="changeError" class="error">{{ changeError }}</p>
        <p v-else-if="gainers.length === 0">暂无可用数据</p>
        <p v-for="item in gainers" :key="item.ammoId">
          {{ item.name }} {{ (item.pct * 100).toFixed(2) }}%
        </p>
      </div>
      <div class="card">
        <h3>7日跌幅Top3</h3>
        <p v-if="changeLoading">计算中...</p>
        <p v-else-if="changeError" class="error">{{ changeError }}</p>
        <p v-else-if="losers.length === 0">暂无可用数据</p>
        <p v-for="item in losers" :key="item.ammoId">
          {{ item.name }} {{ (item.pct * 100).toFixed(2) }}%
        </p>
      </div>
    </div>

    <div v-if="marketStore.loadingLatest" class="card">正在加载行情数据...</div>
    <div v-else-if="marketStore.errorLatest" class="card error">{{ marketStore.errorLatest }}</div>
    <div v-else-if="marketStore.latestItems.length === 0" class="card">暂无行情数据</div>
    <PriceTable v-else :rows="marketStore.latestItems" />
  </section>
</template>
