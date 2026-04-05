<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import NotificationBar from "./components/NotificationBar.vue";

const route = useRoute();
const router = useRouter();

const menus = [
  { label: "行情看板", path: "/dashboard" },
  { label: "价格走势", path: "/charts" },
  { label: "AI建议", path: "/ai-advice" },
  { label: "持仓管理", path: "/holdings" },
  { label: "系统设置", path: "/settings" },
];

const title = computed(() => menus.find((item) => item.path === route.path)?.label ?? "行情系统");

const go = (path: string) => {
  if (path !== route.path) {
    router.push(path);
  }
};
</script>

<template>
  <div class="layout">
    <header class="topbar">
      <h1>三角洲行动子弹行情分析系统</h1>
      <p class="sub">仅做行情展示与分析，不涉及账号行为与自动交易</p>
    </header>
    <nav class="nav">
      <button
        v-for="item in menus"
        :key="item.path"
        class="nav-btn"
        :class="{ active: route.path === item.path }"
        @click="go(item.path)"
      >
        {{ item.label }}
      </button>
    </nav>
    <main class="main">
      <section class="page-header">
        <h2>{{ title }}</h2>
      </section>
      <router-view />
    </main>
    <NotificationBar />
  </div>
</template>
