<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { useNotificationStore } from "../stores/notification";

const notificationStore = useNotificationStore();
const notifications = computed(() => notificationStore.items);
const timers = new Map<number, number>();

const scheduleRemove = (id: number, delayMs = 5000) => {
  const oldTimer = timers.get(id);
  if (oldTimer) {
    window.clearTimeout(oldTimer);
  }
  const timer = window.setTimeout(() => {
    notificationStore.remove(id);
    timers.delete(id);
  }, delayMs);
  timers.set(id, timer);
};

const dismiss = (id: number) => {
  const timer = timers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  notificationStore.remove(id);
};

const onEnter = (id: number) => {
  const timer = timers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
};

const onLeave = (id: number) => {
  scheduleRemove(id, 5000);
};

onMounted(() => {
  if (notificationStore.permission === "default") {
    notificationStore.requestPermission();
  }
});

onMounted(() => {
  notifications.value.forEach((item) => scheduleRemove(item.id, 5000));
});

watch(
  () => notifications.value.map((item) => item.id),
  (ids) => {
    ids.forEach((id) => {
      if (!timers.has(id)) {
        scheduleRemove(id, 5000);
      }
    });
    [...timers.keys()].forEach((id) => {
      if (!ids.includes(id)) {
        const timer = timers.get(id);
        if (timer) {
          window.clearTimeout(timer);
        }
        timers.delete(id);
      }
    });
  }
);

onBeforeUnmount(() => {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers.clear();
});
</script>

<template>
  <div class="notification-wrapper">
    <div
      v-for="item in notifications"
      :key="item.id"
      class="notification-item"
      :class="item.type"
      @mouseenter="onEnter(item.id)"
      @mouseleave="onLeave(item.id)"
    >
      <span>{{ item.message }}</span>
      <button @click="dismiss(item.id)">关闭</button>
    </div>
  </div>
</template>
