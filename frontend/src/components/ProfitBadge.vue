<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  ratio: number | null;
}>();

const label = computed(() => {
  if (props.ratio === null) {
    return "暂无数据";
  }
  const pct = `${(props.ratio * 100).toFixed(2)}%`;
  return props.ratio >= 0 ? `盈利 ${pct}` : `亏损 ${pct}`;
});

const cls = computed(() => {
  if (props.ratio === null) {
    return "neutral";
  }
  return props.ratio >= 0 ? "profit" : "loss";
});
</script>

<template>
  <span class="profit-badge" :class="cls">{{ label }}</span>
</template>
