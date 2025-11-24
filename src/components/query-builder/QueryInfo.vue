<script setup lang="ts">
import { computed } from 'vue';
import type { QueryInfo as QueryInfoType } from '@/types/query';

const props = defineProps<{
  info: QueryInfoType;
}>();

const executionTimeText = computed(() =>
  props.info.executionTime !== null ? `${props.info.executionTime} ms` : '-'
);

const lastExecutedText = computed(() => props.info.lastExecutedAt || '-');
</script>

<template>
  <div class="query-info">
    <v-list density="compact">
      <v-list-item>
        <v-list-item-title class="label">行数</v-list-item-title>
        <v-list-item-subtitle class="value">
          {{ info.rowCount.toLocaleString() }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-divider />
      <v-list-item>
        <v-list-item-title class="label">実行時間</v-list-item-title>
        <v-list-item-subtitle class="value">
          {{ executionTimeText }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-divider />
      <v-list-item>
        <v-list-item-title class="label">最終実行</v-list-item-title>
        <v-list-item-subtitle class="value">
          {{ lastExecutedText }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </div>
</template>

<style scoped>
.query-info {
  padding: 8px 0;
}

.label {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.value {
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.9);
}
</style>
