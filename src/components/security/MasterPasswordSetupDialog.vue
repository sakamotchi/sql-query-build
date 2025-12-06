<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-key-plus</v-icon>
        マスターパスワードの設定
      </v-card-title>

      <v-card-text>
        <v-alert
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <p class="mb-0">
            マスターパスワードは、データベース接続のパスワードを暗号化するために使用されます。
            <strong>このパスワードは絶対に忘れないでください。</strong>
            パスワードを忘れると、保存された接続情報にアクセスできなくなります。
          </p>
        </v-alert>

        <v-form ref="form" v-model="isFormValid">
          <!-- パスワード入力 -->
          <v-text-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="マスターパスワード"
            :rules="passwordRules"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            @input="onPasswordChange"
            autocomplete="new-password"
            class="mb-2"
          />

          <!-- パスワード強度メーター -->
          <PasswordStrengthMeter
            :password="password"
            :strength="passwordStrength"
            class="mb-4"
          />

          <!-- パスワード確認入力 -->
          <v-text-field
            v-model="passwordConfirm"
            :type="showPasswordConfirm ? 'text' : 'password'"
            label="パスワードの確認"
            :rules="confirmRules"
            :append-inner-icon="showPasswordConfirm ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPasswordConfirm = !showPasswordConfirm"
            autocomplete="new-password"
            class="mb-4"
          />

          <!-- パスワード要件 -->
          <PasswordRequirements
            :password="password"
            class="mb-4"
          />
        </v-form>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-0"
        >
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="onCancel"
          :disabled="isLoading"
        >
          キャンセル
        </v-btn>
        <v-btn
          color="primary"
          :loading="isLoading"
          :disabled="!isFormValid"
          @click="onSubmit"
        >
          設定する
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { securityApi } from '@/api/security';
import PasswordRequirements from '@/components/security/PasswordRequirements.vue';
import PasswordStrengthMeter from '@/components/security/PasswordStrengthMeter.vue';
import type { PasswordStrength, PasswordValidationResult } from '@/types/security';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
  cancel: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

type ValidatableForm = { validate: () => boolean | Promise<boolean> };

const form = ref<ValidatableForm | null>(null);
const password = ref('');
const passwordConfirm = ref('');
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const isFormValid = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);
const passwordStrength = ref<PasswordStrength>('very_weak');

const passwordRules = [
  (v: string) => !!v || 'パスワードを入力してください',
  (v: string) => v.length >= 8 || '8文字以上で入力してください',
  (v: string) => v.length <= 128 || '128文字以下で入力してください',
];

const confirmRules = [
  (v: string) => !!v || 'パスワードを再入力してください',
  (v: string) => v === password.value || 'パスワードが一致しません',
];

const onPasswordChange = async () => {
  if (password.value.length > 0) {
    try {
      const result: PasswordValidationResult = await securityApi.checkPasswordStrength(
        password.value
      );
      passwordStrength.value = result.strength;
    } catch {
      // エラーは無視
    }
  } else {
    passwordStrength.value = 'very_weak';
  }
};

const onSubmit = async () => {
  if (!form.value?.validate()) return;

  isLoading.value = true;
  error.value = null;

  try {
    await securityApi.initializeMasterPassword(password.value, passwordConfirm.value);
    emit('success');
    isOpen.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '設定に失敗しました';
  } finally {
    isLoading.value = false;
  }
};

const onCancel = () => {
  password.value = '';
  passwordConfirm.value = '';
  passwordStrength.value = 'very_weak';
  error.value = null;
  emit('cancel');
  isOpen.value = false;
};

watch(isOpen, value => {
  if (!value) {
    password.value = '';
    passwordConfirm.value = '';
    passwordStrength.value = 'very_weak';
    error.value = null;
  }
});
</script>
