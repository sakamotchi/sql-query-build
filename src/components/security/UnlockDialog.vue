<template>
  <v-dialog
    v-model="isOpen"
    max-width="400"
    persistent
    :scrim="true"
    scrim-color="rgba(0,0,0,0.8)"
  >
    <v-card class="unlock-dialog">
      <v-card-item class="text-center pt-8">
        <div class="mb-4">
          <v-avatar size="80" color="primary">
            <v-icon size="48">mdi-database-lock</v-icon>
          </v-avatar>
        </div>
        <v-card-title class="text-h5">SQL Query Builder</v-card-title>
        <v-card-subtitle>マスターパスワードを入力してください</v-card-subtitle>
      </v-card-item>

      <v-card-text class="pt-4">
        <v-form ref="form" v-model="isFormValid" @submit.prevent="onSubmit">
          <v-text-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="マスターパスワード"
            :rules="[v => !!v || 'パスワードを入力してください']"
            :error-messages="error ? [error] : []"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            @keyup.enter="onSubmit"
            autofocus
            autocomplete="current-password"
            variant="outlined"
          />

          <v-fade-transition>
            <div v-if="failedAttempts > 0" class="text-center mb-4">
              <span class="text-caption text-error">
                認証失敗: {{ failedAttempts }} 回
              </span>
              <span v-if="failedAttempts >= 3" class="text-caption text-grey">
                <br />パスワードを忘れた場合は、設定をリセットする必要があります。
              </span>
            </div>
          </v-fade-transition>

          <v-btn
            color="primary"
            size="large"
            block
            :loading="isLoading"
            :disabled="!isFormValid || isLocked"
            type="submit"
          >
            <v-icon start>mdi-lock-open</v-icon>
            アンロック
          </v-btn>
        </v-form>

        <v-fade-transition>
          <v-alert
            v-if="isLocked"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            複数回の認証失敗により、{{ lockoutRemaining }}秒間ロックされています。
          </v-alert>
        </v-fade-transition>
      </v-card-text>

      <v-card-actions class="justify-center pb-6">
        <v-btn
          variant="text"
          size="small"
          @click="showResetConfirm = true"
        >
          パスワードを忘れた場合
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog v-model="showResetConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-error">
          <v-icon start color="error">mdi-alert</v-icon>
          設定のリセット
        </v-card-title>
        <v-card-text>
          <p>
            マスターパスワードをリセットすると、
            <strong>保存されているすべてのデータベースパスワードが削除されます。</strong>
          </p>
          <p class="mb-0">
            接続情報は残りますが、パスワードは再入力が必要になります。
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showResetConfirm = false"
          >
            キャンセル
          </v-btn>
          <v-btn
            color="error"
            @click="onReset"
          >
            リセットする
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useSecurityStore } from '@/stores/security';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  unlocked: [];
  reset: [];
}>();

const securityStore = useSecurityStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

type ValidatableForm = { validate: () => boolean | Promise<boolean> };

const form = ref<ValidatableForm | null>(null);
const password = ref('');
const showPassword = ref(false);
const isFormValid = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);
const failedAttempts = ref(0);
const showResetConfirm = ref(false);

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30;
const isLocked = ref(false);
const lockoutRemaining = ref(0);
let lockoutTimer: ReturnType<typeof setInterval> | null = null;

const clearLockoutTimer = () => {
  if (lockoutTimer) {
    clearInterval(lockoutTimer);
    lockoutTimer = null;
  }
};

const startLockout = () => {
  isLocked.value = true;
  lockoutRemaining.value = LOCKOUT_DURATION;
  clearLockoutTimer();

  lockoutTimer = setInterval(() => {
    lockoutRemaining.value -= 1;
    if (lockoutRemaining.value <= 0) {
      isLocked.value = false;
      failedAttempts.value = 0;
      clearLockoutTimer();
    }
  }, 1000);
};

const onSubmit = async () => {
  if (isLocked.value) return;

  const valid = await form.value?.validate?.();
  if (valid === false || !isFormValid.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    await securityStore.unlock(password.value);
    failedAttempts.value = 0;
    emit('unlocked');
    isOpen.value = false;
  } catch (e) {
    failedAttempts.value += 1;
    error.value = '認証に失敗しました';
    password.value = '';

    if (failedAttempts.value >= MAX_ATTEMPTS) {
      startLockout();
    }
  } finally {
    isLoading.value = false;
  }
};

const onReset = async () => {
  try {
    await securityStore.reset();
    showResetConfirm.value = false;
    emit('reset');
    isOpen.value = false;
  } catch (e) {
    // TODO: エラーハンドリングを追加（UIが決まり次第）
    console.error(e);
  }
};

onUnmounted(() => {
  clearLockoutTimer();
});

watch(isOpen, value => {
  if (!value) {
    password.value = '';
    error.value = null;
    showResetConfirm.value = false;
  }
});
</script>

<style scoped>
.unlock-dialog {
  overflow: hidden;
}
</style>
