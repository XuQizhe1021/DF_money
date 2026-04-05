<script setup lang="ts">
import { computed } from "vue";
import type { AmmoLatestItem } from "../types/api";

const props = defineProps<{
  rows: AmmoLatestItem[];
}>();

const sortBy = defineModel<"price" | "name">("sortBy", { default: "price" });
const sortOrder = defineModel<"asc" | "desc">("sortOrder", { default: "desc" });

const sortedRows = computed(() => {
  const rows = [...props.rows];
  if (sortBy.value === "name") {
    rows.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  } else {
    rows.sort((a, b) => a.price - b.price);
  }
  if (sortOrder.value === "desc") {
    rows.reverse();
  }
  return rows;
});
</script>

<template>
  <div class="card table-card">
    <div class="row" style="margin-bottom: 8px; justify-content: flex-end; gap: 8px">
      <label>
        排序字段
        <select v-model="sortBy">
          <option value="price">按价格</option>
          <option value="name">按名称</option>
        </select>
      </label>
      <label>
        排序方向
        <select v-model="sortOrder">
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
      </label>
    </div>
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
