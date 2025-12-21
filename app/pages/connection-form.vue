<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Connection, ConnectionTestResult, DatabaseType } from '~/types'
import { useConnectionStore } from '~/stores/connection'

const route = useRoute()
const router = useRouter()

const connectionStore = useConnectionStore()
const { connections, loading } = storeToRefs(connectionStore)

const form = reactive<Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  type: 'mysql',
  environment: 'development',
  host: 'localhost',
  port: 3306,
  username: '',
  database: '',
  password: '',
  customColor: undefined
})

const errors = reactive<Record<string, string>>({})
const testing = ref(false)
const saving = ref(false)
const testResult = ref<ConnectionTestResult | null>(null)
const useCustomColor = ref(false)
const showPassword = ref(false)
const loadingConnection = ref(false)

const connectionId = computed(() => (route.query.id as string | undefined) ?? '')
const isEditMode = computed(() => Boolean(connectionId.value))

const databaseOptions: { value: DatabaseType; label: string }[] = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle' }
]

const previewCustomColor = computed(() => (useCustomColor.value ? form.customColor ?? { primary: '#4CAF50', background: '#F1F8E9' } : undefined))

const resetErrors = () => {
  Object.keys(errors).forEach((key) => delete errors[key])
}

const validateForm = () => {
  resetErrors()

  if (!form.name) errors.name = '接続名は必須です'
  if (!form.type) errors.type = 'データベースタイプは必須です'
  if (!form.environment) errors.environment = '環境は必須です'
  if (!form.host) errors.host = 'ホストは必須です'
  if (!/^[a-zA-Z0-9.-]+$/.test(form.host)) errors.host = 'ホスト名の形式が不正です'

  if (!form.port || Number.isNaN(form.port)) {
    errors.port = 'ポートは必須です'
  } else if (form.port < 1 || form.port > 65535) {
    errors.port = 'ポートは1〜65535で指定してください'
  }

  if (!form.database) errors.database = 'データベース名は必須です'
  if (!form.username) errors.username = 'ユーザー名は必須です'

  return Object.keys(errors).length === 0
}

const loadConnectionForEdit = async () => {
  if (!isEditMode.value) return

  loadingConnection.value = true
  try {
    // パスワード復号化付きで接続情報を取得
    const existing = await connectionStore.getConnectionWithPassword(connectionId.value)
    if (existing) {
      const { id, createdAt, updatedAt, ...payload } = existing
      Object.assign(form, payload)
      useCustomColor.value = Boolean(existing.customColor)
    }
  } catch (error) {
    console.error('Failed to load connection for edit:', error)
    // フォールバック: ストアから取得（パスワードなし）
    const existing = connectionStore.getConnectionById(connectionId.value)
    if (existing) {
      const { id, createdAt, updatedAt, ...payload } = existing
      Object.assign(form, payload)
      useCustomColor.value = Boolean(existing.customColor)
    }
  } finally {
    loadingConnection.value = false
  }
}

const testConnection = async () => {
  if (!validateForm()) return
  testing.value = true
  testResult.value = null
  try {
    const result = await connectionStore.testConnection(form)
    testResult.value = result
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '接続テストに失敗しました'
    }
  } finally {
    testing.value = false
  }
}

const submitForm = async () => {
  if (!validateForm()) return
  saving.value = true
  testResult.value = null

  try {
    if (isEditMode.value) {
      await connectionStore.updateConnection(connectionId.value, { ...form })
    } else {
      await connectionStore.createConnection({ ...form })
    }
    await router.push('/')
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '接続の保存に失敗しました'
    }
  } finally {
    saving.value = false
  }
}

const cancel = () => {
  router.back()
}

onMounted(async () => {
  if (!connections.value.length) {
    await connectionStore.loadConnections()
  }
  await loadConnectionForEdit()
})

watch(useCustomColor, (enabled) => {
  if (!enabled) {
    form.customColor = undefined
  } else if (!form.customColor) {
    form.customColor = {
      primary: '#4CAF50',
      background: '#F1F8E9'
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <EnvironmentHeader
      :environment="form.environment"
      :show-toggle="true"
    />

    <main class="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ isEditMode ? '既存接続を編集します' : '新しい接続を作成します' }}
          </p>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode ? '接続を編集' : '新規接続' }}
          </h1>
        </div>

        <div class="flex gap-2">
          <UButton variant="outline" color="neutral" :disabled="loadingConnection" @click="cancel">
            キャンセル
          </UButton>
          <UButton
            color="secondary"
            :loading="testing"
            :disabled="loadingConnection"
            @click="testConnection"
          >
            接続テスト
          </UButton>
          <UButton
            color="primary"
            :loading="saving || loading"
            :disabled="loadingConnection"
            @click="submitForm"
          >
            {{ isEditMode ? '更新' : '作成' }}
          </UButton>
        </div>
      </div>

      <UCard>
        <div v-if="loadingConnection" class="flex items-center justify-center py-12">
          <div class="text-center space-y-3">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p class="text-sm text-gray-500 dark:text-gray-400">接続情報を読み込み中...</p>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="接続名" required :error="errors.name">
                <UInput v-model="form.name" placeholder="例: 開発用MySQL" />
              </UFormField>

              <UFormField label="データベースタイプ" required :error="errors.type">
                <USelect v-model="form.type" :items="databaseOptions" />
              </UFormField>
            </div>

            <UFormField label="環境" required :error="errors.environment">
              <EnvironmentSelector v-model="form.environment" />
            </UFormField>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="ホスト" required :error="errors.host">
                <UInput v-model="form.host" placeholder="localhost" />
              </UFormField>
              <UFormField label="ポート" required :error="errors.port">
                <UInput v-model.number="form.port" type="number" min="1" max="65535" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="データベース名" required :error="errors.database">
                <UInput v-model="form.database" placeholder="sample_db" />
              </UFormField>
              <UFormField label="ユーザー名" required :error="errors.username">
                <UInput v-model="form.username" placeholder="db_user" />
              </UFormField>
            </div>

            <UFormField label="パスワード (任意)">
              <UInput
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="必要に応じて入力"
              >
                <template #trailing>
                  <UButton
                    variant="ghost"
                    color="gray"
                    size="xs"
                    :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>
          </div>

          <div class="space-y-4">
            <UCard>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900 dark:text-white">環境カラー</h3>
                <USwitch v-model="useCustomColor" label="カスタムカラー" />
              </div>
              <div v-if="useCustomColor" class="mt-4 space-y-4">
                <EnvironmentColorPicker
                  v-model:primary-color="form.customColor!.primary"
                  v-model:background-color="form.customColor!.background"
                />
                <ThemePreview
                  :environment="form.environment"
                  :custom-color="previewCustomColor"
                />
              </div>
              <div v-else class="mt-4">
                <ThemePreview :environment="form.environment" />
              </div>
            </UCard>
          </div>
        </div>
      </UCard>

      <div v-if="testResult" class="mt-2">
        <UAlert
          :color="testResult.success ? 'green' : 'red'"
          :title="testResult.success ? '接続テスト成功' : '接続テスト失敗'"
          :description="testResult.message"
        />
      </div>
    </main>
  </div>
</template>
