<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();
const notifications = computed(() => notificationStore.items);

const dismiss = (id: number) => {
  notificationStore.remove(id);
};

onMounted(() => {
  if (notificationStore.permission === "default") {
    notificationStore.requestPermission();
  }
});
</script>

<template>
  <div class="notification-wrapper">
    <div
      v-for="item in notifications"
      :key="item.id"
      class="notification-item"
      :class="item.type"
    >
      <span>{{ item.message }}</span>
      <button @click="dismiss(item.id)">关闭</button>
    </div>
  </div>
</template>
