<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { analysisApi } from "../api/modules/analysis";
import { settingsApi } from "../api/modules/settings";
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();
const loading = ref(false);
const saving = ref(false);
const section = ref<"agent" | "datasource">("agent");
const cleanupDate = ref("");
const cleaning = ref(false);

const aiForm = reactive({
  enabled: true,
  base_url: "",
  model: "",
  api_key: "",
  timeout_seconds: 12,
  max_calls_per_hour: 5,
  cache_ttl_seconds: 1800,
  daily_signal_enabled: true,
  daily_signal_hour: 20,
});

const dsForm = reactive({
  api_base_url: "",
  api_ammo_endpoint: "",
  openid: "",
  access_token: "",
  fetch_interval_hours: 1,
  has_openid: false,
  has_access_token: false,
});

const loadConfig = async () => {
  loading.value = true;
  try {
    const [aiResp, dsResp] = await Promise.all([analysisApi.getConfig(), settingsApi.getDataSourceConfig()]);
    aiForm.enabled = !!aiResp.data.enabled;
    aiForm.base_url = aiResp.data.base_url || "";
    aiForm.model = aiResp.data.model || "";
    aiForm.api_key = "";
    aiForm.timeout_seconds = Number(aiResp.data.timeout_seconds || 12);
    aiForm.max_calls_per_hour = Number(aiResp.data.max_calls_per_hour || 5);
    aiForm.cache_ttl_seconds = Number(aiResp.data.cache_ttl_seconds || 1800);
    aiForm.daily_signal_enabled = !!aiResp.data.daily_signal_enabled;
    aiForm.daily_signal_hour = Number(aiResp.data.daily_signal_hour ?? 20);
    dsForm.api_base_url = dsResp.data.api_base_url || "";
    dsForm.api_ammo_endpoint = dsResp.data.api_ammo_endpoint || "";
    dsForm.openid = "";
    dsForm.access_token = "";
    dsForm.fetch_interval_hours = Number(dsResp.data.fetch_interval_hours || 1);
    dsForm.has_openid = !!dsResp.data.has_openid;
    dsForm.has_access_token = !!dsResp.data.has_access_token;
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "配置加载失败");
  } finally {
    loading.value = false;
  }
};

const saveAgentConfig = async () => {
  saving.value = true;
  try {
    await analysisApi.updateConfig({
      enabled: aiForm.enabled,
      base_url: aiForm.base_url,
      model: aiForm.model,
      timeout_seconds: aiForm.timeout_seconds,
      max_calls_per_hour: aiForm.max_calls_per_hour,
      cache_ttl_seconds: aiForm.cache_ttl_seconds,
      daily_signal_enabled: aiForm.daily_signal_enabled,
      daily_signal_hour: aiForm.daily_signal_hour,
      ...(aiForm.api_key ? { api_key: aiForm.api_key } : {}),
    });
    aiForm.api_key = "";
    notificationStore.push("success", "智能体配置已保存");
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "智能体配置保存失败");
  } finally {
    saving.value = false;
  }
};

const saveDataSourceConfig = async () => {
  saving.value = true;
  try {
    const resp = await settingsApi.updateDataSourceConfig({
      api_base_url: dsForm.api_base_url,
      api_ammo_endpoint: dsForm.api_ammo_endpoint,
      fetch_interval_hours: dsForm.fetch_interval_hours,
      ...(dsForm.openid ? { openid: dsForm.openid } : {}),
      ...(dsForm.access_token ? { access_token: dsForm.access_token } : {}),
    });
    dsForm.openid = "";
    dsForm.access_token = "";
    dsForm.has_openid = !!resp.data.has_openid;
    dsForm.has_access_token = !!resp.data.has_access_token;
    notificationStore.push("success", "数据源配置已保存");
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "数据源配置保存失败");
  } finally {
    saving.value = false;
  }
};

const cleanupHistory = async (mode: "before_7_days" | "before_30_days" | "before_today" | "before_date") => {
  cleaning.value = true;
  try {
    const payload = mode === "before_date" ? { mode, date: cleanupDate.value } : { mode };
    const resp = await settingsApi.cleanupHistory(payload);
    notificationStore.push("success", `历史数据清理完成，删除 ${resp.data.deleted_count} 条`);
  } catch (error) {
    notificationStore.push("error", error instanceof Error ? error.message : "历史数据清理失败");
  } finally {
    cleaning.value = false;
  }
};

onMounted(async () => {
  await loadConfig();
});
</script>

<template>
  <section class="stack">
    <div class="card">
      <h3>新手设置向导</h3>
      <p>
        不懂技术也没关系。你只需要按顺序填两块配置：先填“数据源配置”拿到行情，再填“智能体配置”获得AI建议。
      </p>
      <div class="row">
        <button class="btn" :class="{ ghost: section !== 'datasource' }" @click="section = 'datasource'">
          第一步：数据源配置
        </button>
        <button class="btn" :class="{ ghost: section !== 'agent' }" @click="section = 'agent'">
          第二步：智能体配置
        </button>
      </div>
    </div>

    <div v-if="loading" class="card">配置加载中...</div>

    <div v-else-if="section === 'datasource'" class="card stack">
      <h3>数据源配置（行情抓取）</h3>
      <p>如果你已经从官网拿到 openid 和 access_token，填入后保存即可。未填时系统按默认公开接口尝试抓取。</p>
      <div class="row">
        <label>
          接口基础地址
          <input v-model="dsForm.api_base_url" placeholder="例如：https://xxx.com" />
        </label>
        <label>
          行情接口路径
          <input v-model="dsForm.api_ammo_endpoint" placeholder="例如：/api/ammo/prices" />
        </label>
      </div>
      <div class="row">
        <label>
          openid
          <input v-model="dsForm.openid" placeholder="粘贴你的openid（可选）" />
        </label>
        <label>
          access_token
          <input v-model="dsForm.access_token" placeholder="粘贴你的access_token（可选）" />
        </label>
        <label>
          自动抓取间隔（小时）
          <input v-model.number="dsForm.fetch_interval_hours" type="number" min="1" max="168" />
        </label>
      </div>
      <p class="subline">
        当前状态：openid {{ dsForm.has_openid ? "已配置" : "未配置" }}，access_token
        {{ dsForm.has_access_token ? "已配置" : "未配置" }}
      </p>
      <button class="btn" :disabled="saving" @click="saveDataSourceConfig">
        {{ saving ? "保存中..." : "保存数据源配置" }}
      </button>
      <div class="card stack">
        <h4>历史数据清理</h4>
        <p>用于清理旧数据，避免长期累积。清理后不可恢复，请谨慎操作。</p>
        <div class="row">
          <button class="btn danger" :disabled="cleaning" @click="cleanupHistory('before_7_days')">
            清理7天前数据
          </button>
          <button class="btn danger" :disabled="cleaning" @click="cleanupHistory('before_30_days')">
            清理30天前数据
          </button>
          <button class="btn danger" :disabled="cleaning" @click="cleanupHistory('before_today')">
            清理今天前数据
          </button>
        </div>
        <div class="row">
          <label>
            自定义日期（YYYY-MM-DD）
            <input v-model="cleanupDate" placeholder="例如：2026-03-01" />
          </label>
          <button class="btn danger" :disabled="cleaning || !cleanupDate" @click="cleanupHistory('before_date')">
            清理该日期前数据
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card stack">
      <h3>智能体配置（AI建议）</h3>
      <p>推荐先保持默认参数，只填写 API Key 即可启用。不会使用时也可关闭，系统会自动回退规则分析。</p>
      <div class="row">
        <label>
          是否启用
          <select v-model="aiForm.enabled">
            <option :value="true">启用</option>
            <option :value="false">关闭</option>
          </select>
        </label>
        <label>
          模型地址
          <input v-model="aiForm.base_url" placeholder="例如：https://api.deepseek.com" />
        </label>
        <label>
          模型名
          <input v-model="aiForm.model" placeholder="例如：deepseek-chat" />
        </label>
      </div>
      <div class="row">
        <label>
          API Key
          <input v-model="aiForm.api_key" placeholder="仅在你要更新时填写" />
        </label>
        <label>
          超时秒数
          <input v-model.number="aiForm.timeout_seconds" type="number" min="1" max="120" />
        </label>
        <label>
          每小时调用上限
          <input v-model.number="aiForm.max_calls_per_hour" type="number" min="1" max="120" />
        </label>
      </div>
      <div class="row">
        <label>
          缓存秒数
          <input v-model.number="aiForm.cache_ttl_seconds" type="number" min="10" max="86400" />
        </label>
        <label>
          每日提醒开关
          <select v-model="aiForm.daily_signal_enabled">
            <option :value="true">开启</option>
            <option :value="false">关闭</option>
          </select>
        </label>
        <label>
          每日提醒时间（整点）
          <input v-model.number="aiForm.daily_signal_hour" type="number" min="0" max="23" />
        </label>
      </div>
      <button class="btn" :disabled="saving" @click="saveAgentConfig">
        {{ saving ? "保存中..." : "保存智能体配置" }}
      </button>
    </div>

    <div class="card stack">
      <h3>openId / access_token 获取教程（小白版）</h3>
      <p>1）打开三角洲官网并登录；2）按 F12 打开开发者工具；3）刷新页面后在网络请求里找到含用户信息的请求；4）在请求参数或请求头中复制 openid 和 access_token；5）粘贴到本页保存。</p>
      <p>如果看不到请求，请先勾选“保留日志”，再重新刷新页面。保存后回到看板点击“刷新行情”即可验证。</p>
    </div>
  </section>
</template>
