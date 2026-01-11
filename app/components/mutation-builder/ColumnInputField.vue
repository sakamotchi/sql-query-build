<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDate, Time, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { Column } from '@/types/database-structure'

const df = new DateFormatter('ja-JP', { dateStyle: 'short' })

interface Props {
  column: Column
  value: any
  isNull: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:value': [value: any]
  'update:isNull': [value: boolean]
}>()

const dataType = computed(() => props.column.dataType.toUpperCase())

const isUuidType = computed(() => dataType.value.includes('UUID'))

const inputType = computed(() => {
  if (dataType.value.includes('BOOL')) return 'checkbox'
  if (dataType.value.includes('TEXT')) return 'textarea'
  if (isUuidType.value) return 'uuid'

  // 日時型 (Timestamp/Datetime) - Check this BEFORE Date/Time to avoid misclassification
  if (dataType.value.includes('TIMESTAMP') || dataType.value.includes('DATETIME')) {
    return 'datetime-local'
  }
  // 日付型（Timeを含まない）
  if (dataType.value.includes('DATE') && !dataType.value.includes('TIME')) {
    return 'date'
  }
  // 時刻型（Dateを含まない）
  if (dataType.value.includes('TIME') && !dataType.value.includes('DATE')) {
    return 'time'
  }

  if (
    dataType.value.includes('INT') ||
    dataType.value.includes('NUMERIC') ||
    dataType.value.includes('DECIMAL') ||
    dataType.value.includes('FLOAT') ||
    dataType.value.includes('DOUBLE') ||
    dataType.value.includes('REAL')
  ) {
    return 'number'
  }
  return 'text'
})

const isAutoIncrement = computed(() => props.column.isAutoIncrement)

const isDisabled = computed(() => props.isNull || isAutoIncrement.value)

const hintText = computed(() => {
  if (isAutoIncrement.value) return '自動採番（INSERT時は除外されます）'
  if (props.column.isPrimaryKey) return 'PRIMARY KEY'
  return ''
})

const modelValue = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val),
})

const isNullValue = computed({
  get: () => props.isNull,
  set: (val: boolean) => emit('update:isNull', val),
})

// --- Date Type Handling ---

const dateValue = computed({
  get: () => {
    if (inputType.value !== 'date' || !props.value) return undefined
    try {
      const parts = props.value.split('-')
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        return new CalendarDate(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]))
      }
    } catch (e) {
      console.error('Invalid date format:', props.value, e)
    }
    return undefined
  },
  set: (v: any) => {
    if (v) {
      // YYYY-MM-DD standard format
      emit('update:value', v.toString())
    } else {
      emit('update:value', '')
    }
  }
})

// --- Timestamp/Datetime Handling ---

const timestampDate = ref<CalendarDate | undefined>()
const timestampTime = ref<Time | undefined>()

// value -> local refs sync
watch(() => props.value, (newVal) => {
  if (inputType.value !== 'datetime-local') return

  if (!newVal) {
    timestampDate.value = undefined
    timestampTime.value = undefined
    return
  }

  try {
    // Expected format: "YYYY-MM-DD HH:mm:ss"
    const [d, t] = newVal.split(' ')
    if (d) {
      const dParts = d.split('-')
      if (dParts.length === 3 && dParts[0] && dParts[1] && dParts[2]) {
        timestampDate.value = new CalendarDate(parseInt(dParts[0]), parseInt(dParts[1]), parseInt(dParts[2]))
      }
    }
    if (t) {
      const tParts = t.split(':')
      if (tParts.length >= 2 && tParts[0] && tParts[1]) {
        // Handle seconds if present, default 0
        const sec = tParts[2] ? parseInt(tParts[2]) : 0
        timestampTime.value = new Time(parseInt(tParts[0]), parseInt(tParts[1]), sec)
      } else {
        timestampTime.value = new Time(0, 0, 0)
      }
    } else {
       // If no time part, default to 00:00:00
       timestampTime.value = new Time(0, 0, 0)
    }
  } catch (e) {
    console.error('Invalid timestamp format:', newVal, e)
  }
}, { immediate: true })

// local refs -> value sync
const updateTimestamp = () => {
  if (timestampDate.value) {
    const dStr = timestampDate.value.toString() // YYYY-MM-DD
    let tStr = '00:00:00'
    if (timestampTime.value) {
      tStr = timestampTime.value.toString() // HH:mm:ss
    }
    emit('update:value', `${dStr} ${tStr}`)
  } else {
    // Date is required for a valid timestamp
    emit('update:value', '')
  }
}

const onDateChange = (v: any) => {
  timestampDate.value = v
  updateTimestamp()
}

const onTimeChange = (v: any) => {
  timestampTime.value = v
  updateTimestamp()
}

// --- UUID Handling ---

const generateUuid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    emit('update:value', crypto.randomUUID())
  } else {
    // Fallback for older browsers
    emit('update:value', 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    }))
  }
}

const isValidUuid = computed(() => {
  if (!props.value || props.isNull) return true
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidPattern.test(props.value)
})
</script>

<template>
  <UFormField
    :label="`${column.name} (${column.displayType})`"
    :hint="hintText"
  >
    <!-- Date Type -->
    <template v-if="inputType === 'date'">
      <ClientOnly>
        <UPopover :popper="{ placement: 'bottom-start' }">
          <UButton
            icon="i-heroicons-calendar-days-20-solid"
            color="neutral"
            variant="outline"
            :label="dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : '日付を選択'"
            class="w-full justify-start font-normal text-left"
            :class="{ 'text-gray-500 dark:text-gray-400': !dateValue }"
            :disabled="isDisabled"
          />
          <template #content>
            <UCalendar
              v-model="dateValue as any"
              class="p-2"
            />
          </template>
        </UPopover>
      </ClientOnly>
    </template>

    <!-- Timestamp/Datetime Type -->
    <template v-else-if="inputType === 'datetime-local'">
      <ClientOnly>
        <UPopover :popper="{ placement: 'bottom-start' }">
          <UButton
            icon="i-heroicons-calendar-days-20-solid"
            color="neutral"
            variant="outline"
            :label="timestampDate ? `${df.format(timestampDate.toDate(getLocalTimeZone()))} ${timestampTime?.toString() || ''}` : '日時を選択'"
            class="w-full justify-start font-normal text-left"
            :class="{ 'text-gray-500 dark:text-gray-400': !timestampDate }"
            :disabled="isDisabled"
          />
          <template #content>
            <div class="p-2 flex flex-col gap-2">
              <UCalendar
                :model-value="timestampDate as any"
                @update:model-value="onDateChange"
              />
              <div class="w-full">
                <UInputTime
                  :model-value="timestampTime as any"
                  @update:model-value="onTimeChange"
                  granularity="second"
                />
              </div>
            </div>
          </template>
        </UPopover>
      </ClientOnly>
    </template>

    <!-- UUID Type -->
    <template v-else-if="inputType === 'uuid'">
      <div class="flex gap-2">
        <UInput
          v-model="modelValue"
          :disabled="isDisabled"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          :color="!isValidUuid ? 'error' : undefined"
          class="flex-1"
        />
        <UButton
          icon="i-heroicons-sparkles"
          color="primary"
          variant="outline"
          :disabled="isDisabled"
          @click="generateUuid"
        >
          生成
        </UButton>
      </div>
      <p v-if="!isValidUuid" class="text-xs text-red-500 dark:text-red-400 mt-1">
        無効なUUID形式です
      </p>
    </template>

    <!-- Number Type -->
    <UInput
      v-else-if="inputType === 'number'"
      v-model.number="modelValue"
      type="number"
      :disabled="isDisabled"
    />

    <!-- Textarea Type -->
    <UTextarea
      v-else-if="inputType === 'textarea'"
      v-model="modelValue"
      :disabled="isDisabled"
      :rows="3"
    />

    <!-- Checkbox Type -->
    <UCheckbox
      v-else-if="inputType === 'checkbox'"
      :model-value="Boolean(modelValue)"
      label="TRUE"
      :disabled="isDisabled"
      @update:model-value="(val) => emit('update:value', val)"
    />

    <!-- Default (Text) Type -->
    <UInput
      v-else
      v-model="modelValue"
      :disabled="isDisabled"
    />

    <!-- NULL Checkbox -->
    <UCheckbox
      v-if="column.nullable && !isAutoIncrement"
      :model-value="isNullValue"
      label="NULL"
      class="mt-2"
      @update:model-value="(val: boolean | 'indeterminate') => emit('update:isNull', val === true)"
    />
  </UFormField>
</template>
