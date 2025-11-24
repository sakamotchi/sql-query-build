<script setup lang="ts">
import { ref } from 'vue';

const tabs = [
  { key: 'select', label: 'SELECT' },
  { key: 'where', label: 'WHERE' },
  { key: 'group', label: 'GROUP BY' },
  { key: 'order', label: 'ORDER BY' },
  { key: 'limit', label: 'LIMIT' },
];

const activeTab = ref(tabs[0].key);
</script>

<template>
  <div class="condition-tabs">
    <div class="tabs-header">
      <v-tabs
        v-model="activeTab"
        density="compact"
      >
        <v-tab
          v-for="tab in tabs"
          :key="tab.key"
          :value="tab.key"
        >
          {{ tab.label }}
        </v-tab>
      </v-tabs>
    </div>

    <div class="tabs-content">
      <v-window v-model="activeTab" class="h-100">
        <v-window-item
          v-for="tab in tabs"
          :key="tab.key"
          :value="tab.key"
          class="tab-panel"
        >
          <div class="tab-placeholder">
            <v-icon
              size="28"
              color="primary"
              class="mb-2"
            >
              mdi-dots-grid
            </v-icon>
            <p class="text-body-2 mb-1">
              {{ tab.label }} 条件は今後のタスクで実装予定です
            </p>
            <p class="text-caption text-medium-emphasis">
              フィールド追加やフィルター設定はここに表示されます
            </p>
          </div>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<style scoped>
.condition-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(var(--v-theme-surface));
}

.tabs-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.tabs-content {
  flex: 1;
  overflow: hidden;
}

.tab-panel {
  height: 100%;
}

.tab-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
</style>
