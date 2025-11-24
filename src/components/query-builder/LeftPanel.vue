<script setup lang="ts">
import { ref } from 'vue';

// 検索クエリ
const searchQuery = ref('');

// ツリーのフィルタリング（タスク1.6.3で詳細化）
const handleSearch = (query: string) => {
  searchQuery.value = query;
};
</script>

<template>
  <div class="left-panel">
    <!-- ヘッダー -->
    <div class="panel-header">
      <span class="panel-title">データベース構造</span>
      <v-btn
        icon
        variant="text"
        size="x-small"
        title="更新"
      >
        <v-icon size="small">mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- 検索ボックス -->
    <div class="search-box">
      <v-text-field
        v-model="searchQuery"
        density="compact"
        variant="outlined"
        placeholder="テーブル・カラムを検索..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        @update:model-value="handleSearch"
      />
    </div>

    <!-- DB構造ツリー（タスク1.6.3で実装） -->
    <div class="tree-container">
      <slot name="tree">
        <!-- DatabaseTree コンポーネントをここに配置 -->
        <div class="placeholder-tree">
          <v-icon color="grey-lighten-1">mdi-database-outline</v-icon>
          <p class="text-grey">DB構造ツリー</p>
          <p class="text-caption text-grey">(タスク1.6.3で実装)</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.left-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(var(--v-theme-surface));
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.search-box {
  padding: 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.tree-container {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.placeholder-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
}
</style>
