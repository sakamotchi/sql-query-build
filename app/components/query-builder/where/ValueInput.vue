<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDate, Time, DateFormatter, getLocalTimeZone } from '@internationalized/date'

const { t, locale } = useI18n()

const df = computed(() => new DateFormatter(locale.value === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'short' }))

const props = defineProps<{
  modelValue: string
  dataType?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// 入力タイプ（データ型に応じて変更）
const inputType = computed(() => {
  if (!props.dataType) return 'text'

  const type = props.dataType.toLowerCase()
  // 数値型
  if (type.includes('int') || type.includes('numeric') || type.includes('decimal')) {
    return 'number'
  }
  // 日時型 (Timestamp/Datetime) - Check this BEFORE Date/Time to avoid misclassification
  if (type.includes('timestamp') || type.includes('datetime')) {
    return 'datetime-local'
  }
  // 日付型（Timeを含まない）
  if (type.includes('date') && !type.includes('time')) {
    return 'date'
  }
  // 時刻型（Dateを含まない）
  if (type.includes('time') && !type.includes('date')) {
    return 'time'
  }
  return 'text'
})

// プレースホルダー
const placeholder = computed(() => {
  if (inputType.value === 'number') return t('queryBuilder.valueInput.enterNumber')
  if (inputType.value === 'date') return t('queryBuilder.valueInput.selectDate')
  return t('queryBuilder.valueInput.enterValue')
})

// --- Date Type Handling ---

const dateValue = computed({
  get: () => {
    if (inputType.value !== 'date' || !props.modelValue) return undefined
    try {
      const parts = props.modelValue.split('-')
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        return new CalendarDate(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]))
      }
    } catch (e) {
      console.error('Invalid date format:', props.modelValue, e)
    }
    return undefined
  },
  set: (v: any) => {
    if (v) {
      // YYYY-MM-DD standard format
      emit('update:modelValue', v.toString())
    } else {
      emit('update:modelValue', '')
    }
  }
})

// --- Timestamp/Datetime Handling ---

const timestampDate = ref<CalendarDate | undefined>()
const timestampTime = ref<Time | undefined>()

// modelValue -> local refs sync
watch(() => props.modelValue, (newVal) => {
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

// local refs -> modelValue sync
const updateTimestamp = () => {
  if (timestampDate.value) {
    const dStr = timestampDate.value.toString() // YYYY-MM-DD
    let tStr = '00:00:00'
    if (timestampTime.value) {
      tStr = timestampTime.value.toString() // HH:mm:ss
    }
    emit('update:modelValue', `${dStr} ${tStr}`)
  } else {
    // Date is required for a valid timestamp
    emit('update:modelValue', '')
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

// --- Text/Number Handling ---

const textValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <div>
    <!-- Date Type -->
    <template v-if="inputType === 'date'">
      <ClientOnly>
        <UPopover :popper="{ placement: 'bottom-start' }">
          <UButton
            icon="i-heroicons-calendar-days-20-solid"
            color="neutral"
            variant="outline"
            :label="dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : t('queryBuilder.valueInput.selectDate')"
            class="w-full justify-start font-normal text-left"
            :class="{ 'text-gray-500 dark:text-gray-400': !dateValue }"
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
            :label="timestampDate ? `${df.format(timestampDate.toDate(getLocalTimeZone()))} ${timestampTime?.toString() || ''}` : t('queryBuilder.valueInput.selectDateTime')"
            class="w-full justify-start font-normal text-left"
            :class="{ 'text-gray-500 dark:text-gray-400': !timestampDate }"
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

    <!-- Default (Text/Number) -->
    <template v-else>
      <UInput
        v-model="textValue"
        :type="inputType"
        :placeholder="placeholder"
      />
    </template>
  </div>
</template>
