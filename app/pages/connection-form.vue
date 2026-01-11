<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { Connection, ConnectionTestResult, DatabaseType } from '~/types'
import { useConnectionStore } from '~/stores/connection'
import { sqlIdentifierAttrs } from '@/composables/useSqlIdentifierInput'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

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
const showTestResultDialog = ref(false)
const useCustomColor = ref(false)
const showPassword = ref(false)
const loadingConnection = ref(false)
const isInitializing = ref(false)

const connectionId = computed(() => (route.query.id as string | undefined) ?? '')
const isEditMode = computed(() => Boolean(connectionId.value))

const databaseOptions: { value: DatabaseType; label: string }[] = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' }
]

const previewCustomColor = computed(() => (useCustomColor.value ? form.customColor ?? { primary: '#4CAF50', background: '#F1F8E9' } : undefined))

const resetErrors = () => {
  Object.keys(errors).forEach((key) => delete errors[key])
}

const validateForm = () => {
  resetErrors()

  if (!form.name) errors.name = t('connection.form.validation.nameRequired')
  if (!form.type) errors.type = t('connection.form.validation.typeRequired')
  if (!form.environment) errors.environment = t('connection.form.validation.envRequired')
  if (!form.host) errors.host = t('connection.form.validation.hostRequired')
  if (!/^[a-zA-Z0-9.-]+$/.test(form.host)) errors.host = t('connection.form.validation.hostPattern')

  if (!form.port || Number.isNaN(form.port)) {
    errors.port = t('connection.form.validation.portRequired')
  } else if (form.port < 1 || form.port > 65535) {
    errors.port = t('connection.form.validation.portRange')
  }

  if (!form.database) errors.database = t('connection.form.validation.dbRequired')
  if (!form.username) errors.username = t('connection.form.validation.userRequired')

  return Object.keys(errors).length === 0
}

const loadConnectionForEdit = async () => {
  if (!isEditMode.value) return

  loadingConnection.value = true
  try {
    // パスワード復号化付きで接続情報を取得
    const existing = await connectionStore.getConnectionWithPassword(connectionId.value)
    if (existing) {
      isInitializing.value = true
      try {
        const { id, createdAt, updatedAt, ...payload } = existing
        Object.assign(form, payload)
        useCustomColor.value = Boolean(existing.customColor)
        await nextTick()
      } finally {
        isInitializing.value = false
      }
    }
  } catch (error) {
    console.error('Failed to load connection for edit:', error)
    // フォールバック: ストアから取得（パスワードなし）
    const existing = connectionStore.getConnectionById(connectionId.value)
    if (existing) {
      isInitializing.value = true
      try {
        const { id, createdAt, updatedAt, ...payload } = existing
        Object.assign(form, payload)
        useCustomColor.value = Boolean(existing.customColor)
        await nextTick()
      } finally {
        isInitializing.value = false
      }
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
    showTestResultDialog.value = true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('connection.form.messages.testFailed')
    testResult.value = {
      success: false,
      message: errorMessage,
      errorDetails: error instanceof Error ? error.stack : undefined
    }
    showTestResultDialog.value = true
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
      message: error instanceof Error ? error.message : t('connection.form.messages.saveFailed')
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

watch(() => form.type, (newType) => {
  if (loadingConnection.value || isInitializing.value) return

  if (newType === 'mysql') {
    form.port = 3306
  } else if (newType === 'postgresql') {
    form.port = 5432
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
            {{ isEditMode ? t('connection.form.description.edit') : t('connection.form.description.new') }}
          </p>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ isEditMode ? t('connection.form.title.edit') : t('connection.form.title.new') }}
          </h1>
        </div>

        <div class="flex gap-2">
          <UButton variant="outline" color="neutral" :disabled="loadingConnection" @click="cancel">
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="secondary"
            :loading="testing"
            :disabled="loadingConnection"
            @click="testConnection"
          >
            {{ t('connection.form.actions.test') }}
          </UButton>
          <UButton
            color="primary"
            :loading="saving || loading"
            :disabled="loadingConnection"
            @click="submitForm"
          >
            {{ isEditMode ? t('common.update') : t('common.create') }}
          </UButton>
        </div>
      </div>

      <UCard>
        <div v-if="loadingConnection" class="flex items-center justify-center py-12">
          <div class="text-center space-y-3">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('connection.form.actions.connecting') }}</p>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="t('connection.form.fields.name')" required :error="errors.name">
                <UInput v-model="form.name" :placeholder="t('connection.form.fields.namePlaceholder')" v-bind="sqlIdentifierAttrs" />
              </UFormField>

              <UFormField :label="t('connection.form.fields.type')" required :error="errors.type">
                <USelect v-model="form.type" :items="databaseOptions" />
              </UFormField>
            </div>

            <UFormField :label="t('common.envSuffix')" required :error="errors.environment">
              <EnvironmentSelector v-model="form.environment" />
            </UFormField>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="t('connection.form.fields.host')" required :error="errors.host">
                <UInput v-model="form.host" placeholder="localhost" v-bind="sqlIdentifierAttrs" />
              </UFormField>
              <UFormField :label="t('connection.form.fields.port')" required :error="errors.port">
                <UInput v-model.number="form.port" type="number" min="1" max="65535" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="t('connection.fields.database')" required :error="errors.database">
                <UInput v-model="form.database" :placeholder="t('connection.form.fields.dbPlaceholder')" v-bind="sqlIdentifierAttrs" />
              </UFormField>
              <UFormField :label="t('connection.fields.username')" required :error="errors.username">
                <UInput v-model="form.username" :placeholder="t('connection.form.fields.userPlaceholder')" v-bind="sqlIdentifierAttrs" />
              </UFormField>
            </div>

            <UFormField :label="t('connection.form.fields.password')">
              <UInput
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="t('connection.form.fields.passwordPlaceholder')"
              >
                <template #trailing>
                  <UButton
                    variant="ghost"
                    color="neutral"
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
                <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('connection.form.fields.envColor') }}</h3>
                <USwitch v-model="useCustomColor" :label="t('connection.form.fields.useCustomColor')" />
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
    </main>

    <!-- 接続テスト結果ダイアログ -->
    <ConnectionTestResultDialog
      v-model:open="showTestResultDialog"
      :result="testResult"
    />
  </div>
</template>
