<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import ProfitBadge from "../components/ProfitBadge.vue";
import { useHoldingsStore } from "../stores/holdings";
import { useMarketStore } from "../stores/market";
import { useNotificationStore } from "../stores/notification";

const holdingsStore = useHoldingsStore();
const marketStore = useMarketStore();
const notificationStore = useNotificationStore();

const includeSold = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  ammo_id: "",
  purchase_price: "",
  threshold_pct: "0.15",
});
const editForm = reactive({
  purchase_price: "",
  threshold_pct: "",
});

const formError = ref("");
const isSubmitLocked = computed(() => holdingsStore.submitting);

const validatePrice = (value: string) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
};

const validateThreshold = (value: string) => {
  if (!value) {
    return true;
  }
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 && num <= 10;
};

const loadData = async () => {
  await Promise.all([holdingsStore.fetchList(includeSold.value), marketStore.fetchLatest()]);
  if (holdingsStore.error) {
    notificationStore.push("error", holdingsStore.error);
  }
};

const createHolding = async () => {
  formError.value = "";
  if (!form.ammo_id) {
    formError.value = "请选择子弹";
    return;
  }
  if (!validatePrice(form.purchase_price)) {
    formError.value = "购买价格必须是大于等于0的数字";
    return;
  }
  if (!validateThreshold(form.threshold_pct)) {
    formError.value = "阈值必须在0~10之间";
    return;
  }
  if (isSubmitLocked.value) {
    return;
  }
  try {
    await holdingsStore.create({
      ammo_id: form.ammo_id,
      purchase_price: Number(form.purchase_price),
      threshold_pct: form.threshold_pct ? Number(form.threshold_pct) : undefined,
    });
    await holdingsStore.fetchList(includeSold.value);
    notificationStore.push("success", "持仓新增成功");
    form.purchase_price = "";
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "新增失败");
  }
};

const startEdit = (id: number, purchasePrice: number, thresholdPct: number | null) => {
  editingId.value = id;
  editForm.purchase_price = String(purchasePrice);
  editForm.threshold_pct = thresholdPct === null ? "" : String(thresholdPct);
};

const saveEdit = async (id: number) => {
  if (!validatePrice(editForm.purchase_price) || !validateThreshold(editForm.threshold_pct)) {
    notificationStore.push("error", "编辑参数不合法");
    return;
  }
  if (isSubmitLocked.value) {
    return;
  }
  try {
    await holdingsStore.update(id, {
      purchase_price: Number(editForm.purchase_price),
      threshold_pct: editForm.threshold_pct ? Number(editForm.threshold_pct) : undefined,
    });
    editingId.value = null;
    await holdingsStore.fetchList(includeSold.value);
    notificationStore.push("success", "持仓更新成功");
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "更新失败");
  }
};

const markSold = async (id: number) => {
  if (isSubmitLocked.value) {
    return;
  }
  try {
    await holdingsStore.markSold(id);
    await holdingsStore.fetchList(includeSold.value);
    notificationStore.push("success", "已标记卖出");
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "操作失败");
  }
};

const remove = async (id: number) => {
  if (isSubmitLocked.value) {
    return;
  }
  try {
    await holdingsStore.remove(id);
    await holdingsStore.fetchList(includeSold.value);
    notificationStore.push("success", "持仓已删除");
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "删除失败");
  }
};

onMounted(async () => {
  await loadData();
  form.ammo_id = marketStore.latestItems[0]?.id ?? "";
});
</script>

<template>
  <section class="stack">
    <div class="card stack">
      <h3>新增持仓</h3>
      <div class="row">
        <label>
          子弹
          <select v-model="form.ammo_id">
            <option value="" disabled>请选择</option>
            <option v-for="item in marketStore.ammoOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label>
          成本价
          <input v-model="form.purchase_price" type="number" min="0" step="0.01" />
        </label>
        <label>
          提醒阈值
          <input v-model="form.threshold_pct" type="number" min="0" max="10" step="0.01" />
        </label>
      </div>
      <div class="row">
        <button class="btn" :disabled="isSubmitLocked" @click="createHolding">
          {{ holdingsStore.submitting ? "提交中..." : "新增持仓" }}
        </button>
        <p v-if="formError" class="error-text">{{ formError }}</p>
      </div>
    </div>

    <div class="card row">
      <label>
        <input v-model="includeSold" type="checkbox" @change="loadData" />
        显示已卖出
      </label>
      <button class="btn" :disabled="holdingsStore.loading" @click="loadData">
        {{ holdingsStore.loading ? "加载中..." : "刷新列表" }}
      </button>
    </div>

    <div v-if="holdingsStore.loading" class="card">持仓加载中...</div>
    <div v-else-if="holdingsStore.error" class="card error">{{ holdingsStore.error }}</div>
    <div v-else-if="holdingsStore.items.length === 0" class="card">暂无持仓记录</div>
    <div v-else class="card table-card">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>子弹</th>
            <th>成本价</th>
            <th>现价</th>
            <th>盈亏</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in holdingsStore.items" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.ammo_name }} ({{ item.ammo_id }})</td>
            <td>
              <template v-if="editingId === item.id">
                <input v-model="editForm.purchase_price" type="number" min="0" step="0.01" />
              </template>
              <template v-else>{{ item.purchase_price.toFixed(2) }}</template>
            </td>
            <td>{{ item.latest_price === null ? "-" : item.latest_price.toFixed(2) }}</td>
            <td><ProfitBadge :ratio="item.pnl_ratio" /></td>
            <td>{{ item.status }}</td>
            <td class="row">
              <template v-if="editingId === item.id">
                <input
                  v-model="editForm.threshold_pct"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  placeholder="阈值"
                />
                <button class="btn" :disabled="isSubmitLocked" @click="saveEdit(item.id)">保存</button>
                <button class="btn ghost" @click="editingId = null">取消</button>
              </template>
              <template v-else>
                <button class="btn ghost" @click="startEdit(item.id, item.purchase_price, item.threshold_pct)">
                  编辑
                </button>
                <button class="btn ghost" :disabled="isSubmitLocked" @click="markSold(item.id)">卖出</button>
                <button class="btn danger" :disabled="isSubmitLocked" @click="remove(item.id)">删除</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
