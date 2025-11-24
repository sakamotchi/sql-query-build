<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    sql?: string;
  }>(),
  {
    sql: '',
  }
);
</script>

<template>
  <div class="sql-preview">
    <pre class="sql-text">
{{ props.sql && props.sql.trim() ? props.sql : '-- SQLはまだ生成されていません' }}
    </pre>
  </div>
</template>

<style scoped>
.sql-preview {
  flex: 1;
  background: rgba(var(--v-theme-surface-variant), 0.6);
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
  margin: 12px;
}

.sql-text {
  white-space: pre-wrap;
  margin: 0;
  font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.9);
}
</style>
