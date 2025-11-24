<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQueryBuilderStore } from '@/stores/query-builder';
import SqlPreview from './SqlPreview.vue';
import QueryInfo from './QueryInfo.vue';

const queryBuilderStore = useQueryBuilderStore();

const generatedSql = computed(() => queryBuilderStore.generatedSql);
const queryInfo = computed(() => queryBuilderStore.queryInfo);

const copyFeedback = ref<'idle' | 'copied' | 'error'>('idle');

const copySql = async () => {
  if (
    typeof navigator === 'undefined' ||
    !generatedSql.value ||
    !navigator.clipboard
  ) {
    copyFeedback.value = 'error';
    return;
  }

  try {
    await navigator.clipboard.writeText(generatedSql.value);
    copyFeedback.value = 'copied';
    setTimeout(() => (copyFeedback.value = 'idle'), 1500);
  } catch (error) {
    console.error('SQL copy failed', error);
    copyFeedback.value = 'error';
    setTimeout(() => (copyFeedback.value = 'idle'), 1500);
  }
};
</script>

<template>
  <div class="right-panel">
    <!-- SQLプレビュー -->
    <div class="sql-preview-section">
      <div class="section-header">
        <span class="section-title">SQLプレビュー</span>
        <div class="actions">
          <v-chip
            v-if="copyFeedback === 'copied'"
            color="success"
            size="small"
            variant="flat"
            class="mr-2"
          >
            コピーしました
          </v-chip>
          <v-chip
            v-else-if="copyFeedback === 'error'"
            color="error"
            size="small"
            variant="flat"
            class="mr-2"
          >
            コピーに失敗しました
          </v-chip>
          <v-btn
            icon
            variant="text"
            size="x-small"
            title="コピー"
            :disabled="!generatedSql"
            @click="copySql"
          >
            <v-icon size="small">mdi-content-copy</v-icon>
          </v-btn>
        </div>
      </div>
      <SqlPreview :sql="generatedSql" />
    </div>

    <!-- クエリ情報 -->
    <div class="query-info-section">
      <div class="section-header">
        <span class="section-title">クエリ情報</span>
      </div>
      <QueryInfo :info="queryInfo" />
    </div>
  </div>
</template>

<style scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgb(var(--v-theme-surface));
}

.sql-preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
}

.query-info-section {
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.section-title {
  font-size: 0.875rem;
  font-weight: 500;
}

.actions {
  display: flex;
  align-items: center;
}
</style>
