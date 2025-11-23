<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  windowCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'restore'): void;
  (e: 'skip'): void;
}>();

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const handleRestore = () => {
  emit('restore');
};

const handleSkip = () => {
  emit('skip');
};
</script>

<template>
  <v-dialog v-model="show" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-h6">
        前回のセッションを復元
      </v-card-title>

      <v-card-text>
        前回のセッションで {{ windowCount }} 個のウィンドウが開かれていました。
        復元しますか？
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleSkip"
        >
          スキップ
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="handleRestore"
        >
          復元する
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
