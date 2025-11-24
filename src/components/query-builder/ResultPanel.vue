<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    results?: Array<Record<string, unknown>>;
  }>(),
  {
    results: () => [],
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const sampleResults = [
  { id: 1, name: 'Alice', status: 'active', updatedAt: '2024-04-01' },
  { id: 2, name: 'Bob', status: 'inactive', updatedAt: '2024-03-12' },
  { id: 3, name: 'Carol', status: 'active', updatedAt: '2024-02-20' },
];

const rows = computed(() =>
  props.results && props.results.length > 0 ? props.results : sampleResults
);

const headers = computed(() =>
  rows.value.length > 0 ? Object.keys(rows.value[0]) : []
);
</script>

<template>
  <div class="result-panel">
    <div class="result-header">
      <div>
        <p class="title">実行結果</p>
        <p class="subtitle">結果表示は今後のタスクでデータと連携予定です</p>
      </div>
      <v-btn
        icon
        variant="text"
        size="small"
        title="閉じる"
        @click="emit('close')"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </div>

    <div class="result-body">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th
              v-for="header in headers"
              :key="header"
              class="text-left text-caption text-medium-emphasis"
            >
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in rows"
            :key="index"
          >
            <td
              v-for="header in headers"
              :key="header"
              class="text-body-2"
            >
              {{ row[header] }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>

<style scoped>
.result-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(var(--v-theme-surface));
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.title {
  font-weight: 600;
  margin: 0;
}

.subtitle {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.85rem;
}

.result-body {
  flex: 1;
  overflow: auto;
}
</style>
