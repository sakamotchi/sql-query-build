<template>
  <v-dialog
    v-model="model"
    max-width="520"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-shield-sync</v-icon>
        セキュリティ方式を変更
        <v-spacer />
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 mb-4">
          保存済みの認証情報を新しい方式で再暗号化します。切り替え中は処理が中断しないようにしてください。
        </p>

        <div class="mb-4 d-flex align-center">
          <v-chip class="mr-2" color="grey-lighten-3" variant="tonal">
            {{ providerLabel(fromProvider) }}
          </v-chip>
          <v-icon class="mr-2">mdi-arrow-right</v-icon>
          <v-chip color="primary" variant="tonal">
            {{ providerLabel(toProvider) }}
          </v-chip>
        </div>

        <v-alert
          v-if="infoMessage"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          {{ infoMessage }}
        </v-alert>

        <v-form>
          <v-text-field
            v-if="needsCurrentPassword"
            v-model="currentPassword"
            type="password"
            label="現在のマスターパスワード"
            autocomplete="current-password"
            :disabled="loading"
            hide-details="auto"
            class="mb-2"
          />

          <v-text-field
            v-if="needsNewPassword"
            v-model="newPassword"
            type="password"
            label="新しいマスターパスワード"
            autocomplete="new-password"
            :disabled="loading"
            hide-details="auto"
            class="mb-2"
          />

          <v-text-field
            v-if="needsNewPassword"
            v-model="newPasswordConfirm"
            type="password"
            label="新しいマスターパスワード（確認）"
            autocomplete="new-password"
            :disabled="loading"
            hide-details="auto"
            class="mb-2"
          />

          <v-alert
            v-if="validationError"
            type="error"
            variant="tonal"
            class="mt-2"
          >
            {{ validationError }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="loading"
          @click="handleCancel"
        >
          キャンセル
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!canSubmit || loading"
          @click="handleConfirm"
        >
          変更する
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  ProviderChangeParams,
  SecurityProviderInfo,
  SecurityProviderType,
} from '@/types/security';

const props = defineProps<{
  modelValue: boolean;
  fromProvider: SecurityProviderType | null;
  toProvider: SecurityProviderType | null;
  providers?: SecurityProviderInfo[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [params: ProviderChangeParams];
  cancel: [];
}>();

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const currentPassword = ref('');
const newPassword = ref('');
const newPasswordConfirm = ref('');
const validationError = ref('');

const needsCurrentPassword = computed(() => props.fromProvider === 'master_password');
const needsNewPassword = computed(() => props.toProvider === 'master_password');

const providerLabel = (type: SecurityProviderType | null) => {
  if (!type) return '';
  const match = props.providers?.find(provider => provider.type === type);
  if (match) return match.displayName;

  switch (type) {
    case 'master_password':
      return 'マスターパスワード';
    case 'keychain':
      return 'OSキーチェーン';
    case 'simple':
    default:
      return 'シンプル';
  }
};

const infoMessage = computed(() => {
  if (props.toProvider === 'master_password') {
    return 'マスターパスワード方式では、再暗号化のために新しいパスワードを設定します。';
  }
  if (props.toProvider === 'keychain') {
    return 'OSのキーチェーンを利用して安全に鍵を管理します。';
  }
  return '';
});

const resetForm = () => {
  currentPassword.value = '';
  newPassword.value = '';
  newPasswordConfirm.value = '';
  validationError.value = '';
};

watch(
  () => props.modelValue,
  value => {
    if (!value) {
      resetForm();
    }
  }
);

const validate = () => {
  if (needsCurrentPassword.value && !currentPassword.value) {
    validationError.value = '現在のパスワードを入力してください';
    return false;
  }

  if (needsNewPassword.value) {
    if (!newPassword.value || !newPasswordConfirm.value) {
      validationError.value = '新しいパスワードを入力してください';
      return false;
    }

    if (newPassword.value !== newPasswordConfirm.value) {
      validationError.value = '確認用パスワードが一致しません';
      return false;
    }
  }

  validationError.value = '';
  return true;
};

const canSubmit = computed(() => {
  if (!props.toProvider) return false;
  if (needsCurrentPassword.value && !currentPassword.value) return false;
  if (needsNewPassword.value && (!newPassword.value || !newPasswordConfirm.value)) return false;
  return true;
});

const handleConfirm = () => {
  if (!props.toProvider) return;
  if (!validate()) return;

  emit('confirm', {
    targetProvider: props.toProvider,
    currentPassword: needsCurrentPassword.value ? currentPassword.value : undefined,
    newPassword: needsNewPassword.value ? newPassword.value : undefined,
    newPasswordConfirm: needsNewPassword.value ? newPasswordConfirm.value : undefined,
  });
};

const handleCancel = () => {
  emit('cancel');
  emit('update:modelValue', false);
};
</script>
