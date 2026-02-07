<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import * as monaco from 'monaco-editor'
import { useSqlEditorStore } from '~/stores/sql-editor'
import { useDatabaseStructureStore } from '~/stores/database-structure'
import { useSqlCompletion } from '~/composables/useSqlCompletion'

const sqlEditorStore = useSqlEditorStore()
const databaseStructureStore = useDatabaseStructureStore()
const { sql: currentSql, error, formatRequestId, activeTabId } = storeToRefs(sqlEditorStore)
const colorMode = useColorMode()
const { t } = useI18n()
const { provideCompletionItems } = useSqlCompletion()

const editorElement = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let decorations: string[] = []
let completionDisposable: monaco.IDisposable | null = null

const resolveTheme = () => (colorMode.value === 'dark' ? 'vs-dark' : 'vs')
const summaryLoading = computed(() => {
  if (!sqlEditorStore.connectionId) return false
  return databaseStructureStore.isSummaryLoading(sqlEditorStore.connectionId)
})
const backgroundProgress = computed(() => {
  if (!sqlEditorStore.connectionId) return null
  return databaseStructureStore.getBackgroundProgress(sqlEditorStore.connectionId)
})

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
    glyphMargin: true,
    matchBrackets: 'always',
    bracketPairColorization: { enabled: true },
    find: {
      seedSearchStringFromSelection: 'always',
      autoFindInSelection: 'never',
    },
    quickSuggestions: { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: true,
  })

  editor.addAction({
    id: 'execute-query',
    label: 'Execute Query',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
    run: async () => {
      await sqlEditorStore.executeQuery()
    },
  })

  editor.addAction({
    id: 'cancel-query',
    label: 'Cancel Query',
    keybindings: [monaco.KeyCode.Escape],
    run: async () => {
      await sqlEditorStore.cancelQuery()
    },
  })

  editor.addAction({
    id: 'save-query',
    label: 'Save Query',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    run: () => {
      sqlEditorStore.openSaveDialog()
    },
  })

  editor.addAction({
    id: 'format-sql',
    label: 'Format SQL',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
    run: () => {
      sqlEditorStore.requestFormat()
    },
  })

  editor.addAction({
    id: 'new-tab',
    label: 'New Tab',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
    run: () => {
      sqlEditorStore.addTab()
    },
  })

  editor.addAction({
    id: 'trigger-suggest',
    label: 'Trigger Suggest',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space],
    run: () => {
      editor?.trigger('keyboard', 'editor.action.triggerSuggest', {})
    },
  })

  completionDisposable = monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model, position) => provideCompletionItems(model, position),
    triggerCharacters: ['.', ' '],
  })

  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() ?? ''
    sqlEditorStore.updateSql(value)
  })

  editor.onDidChangeCursorSelection(() => {
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection || selection.isEmpty()) {
      sqlEditorStore.setSelectionSql(null)
      return
    }

    const model = editor.getModel()
    if (!model) {
      sqlEditorStore.setSelectionSql(null)
      return
    }

    const selectedSql = model.getValueInRange(selection)
    sqlEditorStore.setSelectionSql(selectedSql)
  })

  editor.onDidChangeCursorPosition((event) => {
    sqlEditorStore.setCursorPosition({
      lineNumber: event.position.lineNumber,
      column: event.position.column,
    })
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

watch(
  () => formatRequestId.value,
  () => {
    if (!editor) return
    const formatted = sqlEditorStore.formatSqlText(editor.getValue())
    if (!formatted || formatted === editor.getValue()) return
    const model = editor.getModel()
    if (!model) return
    const selection = editor.getSelection()
    editor.pushUndoStop()
    editor.executeEdits('sql-format', [
      {
        range: model.getFullModelRange(),
        text: formatted,
      },
    ])
    editor.pushUndoStop()
    if (selection) {
      editor.setSelection(selection)
    }
  }
)

watch(
  () => activeTabId.value,
  async () => {
    if (!editor) return
    await nextTick()
    const position = sqlEditorStore.activeTab?.cursorPosition
    if (!position) return
    editor.setPosition(position)
    editor.revealPositionInCenterIfOutsideViewport(position)
  }
)

watch(
  () => error.value,
  (newError) => {
    if (!editor) return
    decorations = editor.deltaDecorations(decorations, [])

    const lineNumber = newError?.details?.line
    if (!lineNumber) return

    decorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'sql-editor-error-line',
          glyphMarginClassName: 'sql-editor-error-glyph',
        },
      },
    ])
  }
)

onBeforeUnmount(() => {
  if (completionDisposable) {
    completionDisposable.dispose()
    completionDisposable = null
  }
  if (editor) {
    editor.dispose()
    editor = null
  }
  sqlEditorStore.setSelectionSql(null)
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="editorElement" class="h-full w-full" />

    <div
      v-if="summaryLoading || backgroundProgress"
      class="pointer-events-none absolute top-2 right-2 z-10 flex flex-col gap-1"
    >
      <div
        v-if="summaryLoading"
        class="flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200"
      >
        <UIcon name="i-heroicons-arrow-path" class="h-3.5 w-3.5 animate-spin" />
        <span>{{ t('sqlEditor.structureLoading.summary') }}</span>
      </div>

      <div
        v-if="backgroundProgress"
        class="flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200"
      >
        <UIcon name="i-heroicons-circle-stack" class="h-3.5 w-3.5" />
        <span>
          {{
            t('sqlEditor.structureLoading.background', {
              loaded: backgroundProgress.loaded,
              total: backgroundProgress.total,
            })
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.sql-editor-error-line) {
  background-color: rgba(239, 68, 68, 0.15);
}

:deep(.sql-editor-error-glyph) {
  background-color: #ef4444;
}
</style>
