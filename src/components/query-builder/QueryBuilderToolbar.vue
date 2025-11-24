<script setup lang="ts">
import { computed } from 'vue';
import { useQueryBuilderStore } from '@/stores/query-builder';

const emit = defineEmits<{
  (e: 'toggle-left-panel'): void;
  (e: 'toggle-right-panel'): void;
  (e: 'toggle-result-panel'): void;
}>();

const queryBuilderStore = useQueryBuilderStore();

// 実行可能かどうか
const canExecute = computed(() => queryBuilderStore.canExecuteQuery);

// 実行中かどうか
const isExecuting = computed(() => queryBuilderStore.isExecuting);

/**
 * クエリ実行
 */
const executeQuery = () => {
  queryBuilderStore.executeQuery();
};

/**
 * クエリ保存
 */
const saveQuery = () => {
  // TODO: クエリ保存ダイアログを開く
};

/**
 * 新規クエリ作成
 */
const createNewQuery = () => {
  queryBuilderStore.resetQuery();
};

/**
 * クエリ履歴を開く
 */
const openHistory = () => {
  // TODO: クエリ履歴パネルを開く
};
</script>

<template>
  <v-toolbar density="compact" class="query-builder-toolbar">
    <!-- 左パネル切り替え -->
    <v-btn
      icon
      variant="text"
      size="small"
      title="DB構造パネル"
      @click="emit('toggle-left-panel')"
    >
      <v-icon>mdi-database-outline</v-icon>
    </v-btn>

    <v-divider vertical class="mx-2" />

    <!-- メインアクション -->
    <v-btn
      color="primary"
      variant="flat"
      size="small"
      :disabled="!canExecute || isExecuting"
      :loading="isExecuting"
      @click="executeQuery"
    >
      <v-icon start>mdi-play</v-icon>
      実行
    </v-btn>

    <v-btn
      variant="text"
      size="small"
      class="ml-2"
      @click="saveQuery"
    >
      <v-icon start>mdi-content-save</v-icon>
      保存
    </v-btn>

    <v-btn
      variant="text"
      size="small"
      class="ml-2"
      @click="createNewQuery"
    >
      <v-icon start>mdi-file-plus</v-icon>
      新規
    </v-btn>

    <v-divider vertical class="mx-2" />

    <!-- 履歴 -->
    <v-btn
      icon
      variant="text"
      size="small"
      title="クエリ履歴"
      @click="openHistory"
    >
      <v-icon>mdi-history</v-icon>
    </v-btn>

    <v-spacer />

    <!-- 表示切り替え -->
    <v-btn
      icon
      variant="text"
      size="small"
      title="結果パネル"
      @click="emit('toggle-result-panel')"
    >
      <v-icon>mdi-table</v-icon>
    </v-btn>

    <v-btn
      icon
      variant="text"
      size="small"
      title="SQLプレビューパネル"
      @click="emit('toggle-right-panel')"
    >
      <v-icon>mdi-code-tags</v-icon>
    </v-btn>
  </v-toolbar>
</template>

<style scoped>
.query-builder-toolbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
