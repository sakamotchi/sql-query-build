<script setup lang="ts">
const sampleRelations = [
  { id: 'table-a', name: 'テーブルA', columns: ['id', 'name', 'created_at'] },
  { id: 'table-b', name: 'テーブルB', columns: ['id', 'table_a_id', 'status'] },
];
</script>

<template>
  <div class="table-relation-wrapper">
    <div class="relation-header">
      <div>
        <p class="title">テーブル関係図</p>
        <p class="subtitle">ドラッグ＆ドロップでテーブル配置（今後のタスクで実装）</p>
      </div>
      <v-btn
        icon
        variant="text"
        size="small"
        title="ズームをリセット"
      >
        <v-icon size="small">mdi-magnify-scan</v-icon>
      </v-btn>
    </div>

    <div class="relation-canvas">
      <div class="relation-grid">
        <div
          v-for="table in sampleRelations"
          :key="table.id"
          class="relation-node"
        >
          <div class="node-header">
            <v-icon size="small" class="mr-1">mdi-table</v-icon>
            <span>{{ table.name }}</span>
          </div>
          <ul class="node-columns">
            <li
              v-for="column in table.columns"
              :key="column"
            >
              {{ column }}
            </li>
          </ul>
        </div>

        <div class="relation-placeholder">
          <p class="text-body-2 text-medium-emphasis mb-1">
            テーブルやJOINは別タスクで実装予定です
          </p>
          <p class="text-caption text-disabled">
            ここではレイアウト確認のみ行えます
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-relation-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    180deg,
    rgba(var(--v-theme-surface), 1) 0%,
    rgba(var(--v-theme-surface-variant), 0.4) 100%
  );
}

.relation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.title {
  font-weight: 600;
  margin: 0;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.relation-canvas {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.relation-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  min-height: 100%;
}

.relation-node {
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 12px;
}

.node-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
}

.node-columns {
  list-style: none;
  padding: 0 0 0 4px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.relation-placeholder {
  position: relative;
  border: 1px dashed rgba(var(--v-border-color), 0.6);
  border-radius: 12px;
  padding: 16px;
  background: repeating-linear-gradient(
    -45deg,
    rgba(var(--v-border-color), 0.08),
    rgba(var(--v-border-color), 0.08) 10px,
    transparent 10px,
    transparent 20px
  );
}
</style>
