<script setup lang="ts">
import { computed } from "vue";
import type { AmmoLatestItem } from "../types/api";

const props = defineProps<{
  rows: AmmoLatestItem[];
}>();

const sortedRows = computed(() => {
  return [...props.rows].sort((a, b) => b.price - a.price);
});
</script>

<template>
  <div class="card table-card">
    <table class="table">
      <thead>
        <tr>
          <th>子弹ID</th>
          <th>名称</th>
          <th>价格</th>
          <th>更新时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedRows" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.price.toFixed(2) }}</td>
          <td>{{ item.recorded_at }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
