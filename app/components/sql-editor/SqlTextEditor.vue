<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import * as monaco from 'monaco-editor'
import { useSqlEditorStore } from '~/stores/sql-editor'

const sqlEditorStore = useSqlEditorStore()
const { sql: currentSql } = storeToRefs(sqlEditorStore)
const colorMode = useColorMode()

const editorElement = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const resolveTheme = () => (colorMode.value === 'dark' ? 'vs-dark' : 'vs')

onMounted(() => {
  if (!editorElement.value) return

  editor = monaco.editor.create(editorElement.value, {
    value: currentSql.value,
    language: 'sql',
    theme: resolveTheme(),
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    fontSize: 14,
    readOnly: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  })

  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() ?? ''
    sqlEditorStore.updateSql(value)
  })
})

watch(
  () => colorMode.value,
  () => {
    if (!editor) return
    monaco.editor.setTheme(resolveTheme())
  }
)

watch(
  () => currentSql.value,
  (newSql) => {
    if (!editor) return
    const currentValue = editor.getValue()
    if (newSql !== currentValue) {
      editor.setValue(newSql)
    }
  }
)

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})
</script>

<template>
  <div ref="editorElement" class="h-full w-full" />
</template>
