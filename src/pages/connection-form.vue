<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <span class="text-h5">
        {{ mode === 'create' ? '新規接続' : mode === 'edit' ? '接続編集' : '接続複製' }}
      </span>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-close" variant="text" @click="handleCancel"></v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text>
      <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSave">
        <!-- 基本情報 + プレビュー -->
        <v-row class="mb-4" align="stretch">
          <v-col cols="12" md="7">
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-subtitle-1">基本情報</v-card-title>
              <v-card-text>
                <v-text-field
                  v-model="formData.name"
                  label="接続名"
                  :rules="validationRules.name"
                  required
                  variant="outlined"
                  prepend-inner-icon="mdi-label"
                  autocomplete="off"
                  autocapitalize="off"
                ></v-text-field>

                <EnvironmentSelector
                  v-model="formData.environment"
                />

                <EnvironmentColorPicker
                  v-model="formData.themeColor"
                  :environment="formData.environment"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="5">
            <ThemePreview
              :environment="formData.environment"
              :connection-name="formData.name || 'サンプル接続'"
            />
          </v-col>
        </v-row>

        <!-- データベース設定 -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1">データベース設定</v-card-title>
          <v-card-text>
            <v-select
              v-model="formData.dbType"
              :items="databaseTypeOptions"
              label="データベース種別"
              required
              variant="outlined"
              prepend-inner-icon="mdi-database"
              @update:model-value="handleDatabaseTypeChange"
            >
              <template v-slot:item="{ item, props }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon>{{ item.raw.icon }}</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-text-field
              v-model="formData.host"
              label="ホスト"
              :rules="databaseValidationRules.host"
              required
              variant="outlined"
              prepend-inner-icon="mdi-server-network"
              placeholder="localhost"
              autocomplete="off"
              autocapitalize="off"
            ></v-text-field>

            <v-text-field
              v-model.number="formData.port"
              label="ポート"
              :rules="databaseValidationRules.port"
              required
              type="number"
              variant="outlined"
              prepend-inner-icon="mdi-numeric"
              autocomplete="off"
            ></v-text-field>

            <v-text-field
              v-model="formData.database"
              label="データベース名"
              :rules="databaseValidationRules.database"
              required
              variant="outlined"
              prepend-inner-icon="mdi-database"
              autocomplete="off"
              autocapitalize="off"
            ></v-text-field>
          </v-card-text>
        </v-card>

        <!-- 認証情報 -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1">認証情報</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="formData.username"
              label="ユーザー名"
              :rules="authValidationRules.username"
              required
              variant="outlined"
              prepend-inner-icon="mdi-account"
              autocomplete="username"
              autocapitalize="off"
            ></v-text-field>

            <v-text-field
              v-model="formData.password"
              :label="formData.savePassword ? 'パスワード *' : 'パスワード (接続時に入力)'"
              :rules="authValidationRules.password"
              :type="showPassword ? 'text' : 'password'"
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              autocomplete="current-password"
              autocapitalize="off"
            ></v-text-field>

            <v-checkbox
              v-model="formData.savePassword"
              label="パスワードを保存する"
              hint="パスワードは暗号化して保存されます"
              persistent-hint
            ></v-checkbox>

            <v-alert v-if="!formData.savePassword" type="info" variant="tonal" class="mt-2">
              パスワードを保存しない場合、接続時に毎回入力が必要です
            </v-alert>
          </v-card-text>
        </v-card>

        <!-- 詳細設定 -->
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-2">mdi-cog</v-icon>
              詳細設定
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-checkbox
                v-model="formData.ssl"
                label="SSL接続を使用"
                hint="セキュアな接続を使用します"
                persistent-hint
              ></v-checkbox>

              <v-checkbox
                v-model="formData.sshTunnel"
                label="SSHトンネルを使用"
                hint="SSHトンネル経由でデータベースに接続します"
                persistent-hint
                class="mt-4"
              ></v-checkbox>

              <!-- SSH設定 (SSHトンネル有効時のみ表示) -->
              <v-expand-transition>
                <div v-if="formData.sshTunnel" class="mt-4">
                  <v-divider class="mb-4"></v-divider>
                  <div class="text-subtitle-2 mb-2">SSH設定</div>

                  <v-text-field
                    v-model="formData.sshHost"
                    label="SSHホスト"
                    variant="outlined"
                    density="compact"
                    autocomplete="off"
                    autocapitalize="off"
                  ></v-text-field>

                  <v-text-field
                    v-model.number="formData.sshPort"
                    label="SSHポート"
                    type="number"
                    variant="outlined"
                    density="compact"
                    autocomplete="off"
                  ></v-text-field>

                  <v-text-field
                    v-model="formData.sshUsername"
                    label="SSHユーザー名"
                    variant="outlined"
                    density="compact"
                    autocomplete="off"
                    autocapitalize="off"
                  ></v-text-field>

                  <v-text-field
                    v-model="formData.sshPassword"
                    label="SSHパスワード"
                    :type="showSshPassword ? 'text' : 'password'"
                    variant="outlined"
                    density="compact"
                    :append-inner-icon="showSshPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showSshPassword = !showSshPassword"
                    autocomplete="off"
                    autocapitalize="off"
                  ></v-text-field>
                </div>
              </v-expand-transition>

              <v-text-field
                v-model.number="formData.timeout"
                label="接続タイムアウト (秒)"
                type="number"
                variant="outlined"
                hint="0で無制限"
                persistent-hint
                class="mt-4"
                autocomplete="off"
              ></v-text-field>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-form>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-connection"
        :loading="testingConnection"
        @click="handleTestConnection"
      >
        接続テスト
      </v-btn>

      <v-spacer></v-spacer>

      <v-btn variant="text" @click="handleCancel">
        キャンセル
      </v-btn>

      <v-btn
        color="primary"
        variant="flat"
        :loading="savingConnection"
        :disabled="savingConnection"
        @click="handleSave"
      >
        保存
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { Connection, Environment, DatabaseType } from '@/types/connection';
import EnvironmentColorPicker from '@/components/connection/EnvironmentColorPicker.vue';
import EnvironmentSelector from '@/components/connection/EnvironmentSelector.vue';
import ThemePreview from '@/components/connection/ThemePreview.vue';

interface ConnectionFormData {
  name: string;
  environment: Environment;
  themeColor: string;
  dbType: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  savePassword: boolean;
  ssl: boolean;
  sshTunnel: boolean;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  timeout: number;
}

const props = defineProps<{
  connection?: Connection;
  mode: 'create' | 'edit' | 'duplicate';
}>();

const emit = defineEmits<{
  save: [connection: Connection];
  cancel: [];
  'test-connection': [connection: Connection];
}>();

// フォーム状態
const formRef = ref<any>(null);
const formValid = ref(false);
const showPassword = ref(false);
const showSshPassword = ref(false);
const testingConnection = ref(false);
const savingConnection = ref(false);

// フォームデータ
const formData = reactive<ConnectionFormData>({
  name: '',
  environment: 'development',
  themeColor: '#4CAF50',
  dbType: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: '',
  username: '',
  password: '',
  savePassword: true,
  ssl: false,
  sshTunnel: false,
  sshHost: '',
  sshPort: 22,
  sshUsername: '',
  sshPassword: '',
  timeout: 30,
});

// データベース種別オプション
const databaseTypeOptions = [
  {
    title: 'PostgreSQL',
    value: 'postgresql',
    icon: 'mdi-elephant',
    defaultPort: 5432,
  },
  {
    title: 'MySQL',
    value: 'mysql',
    icon: 'mdi-dolphin',
    defaultPort: 3306,
  },
  {
    title: 'SQLite',
    value: 'sqlite',
    icon: 'mdi-database',
    defaultPort: 0,
  },
];

// バリデーションルール
const validationRules = {
  name: [
    (v: string) => !!v || '接続名は必須です',
    (v: string) => v.length <= 100 || '接続名は100文字以内で入力してください',
  ],
};

const databaseValidationRules = {
  host: [
    (v: string) => !!v || 'ホスト名は必須です',
    (v: string) => /^[a-zA-Z0-9.-]+$/.test(v) || 'ホスト名の形式が正しくありません',
  ],
  port: [
    (v: number) => !!v || 'ポート番号は必須です',
    (v: number) => v > 0 && v <= 65535 || 'ポート番号は1-65535の範囲で入力してください',
  ],
  database: [
    (v: string) => !!v || 'データベース名は必須です',
    (v: string) => v.length <= 63 || 'データベース名は63文字以内で入力してください',
  ],
};

const authValidationRules = {
  username: [
    (v: string) => !!v || 'ユーザー名は必須です',
  ],
  password: [
    (v: string) => {
      if (formData.savePassword) {
        return !!v || 'パスワードは必須です';
      }
      return true;
    },
  ],
};

// データベース種別変更時の処理
const handleDatabaseTypeChange = (dbType: DatabaseType) => {
  const option = databaseTypeOptions.find(opt => opt.value === dbType);
  if (option && option.defaultPort > 0) {
    formData.port = option.defaultPort;
  }
};

// 初期化
const initializeForm = () => {
  if (props.connection && (props.mode === 'edit' || props.mode === 'duplicate')) {
    Object.assign(formData, {
      ...props.connection,
      name: props.mode === 'duplicate' ? `${props.connection.name} (コピー)` : props.connection.name,
    });
  }
};

const buildConnectionData = (): Connection => {
  return {
    id: props.connection?.id || crypto.randomUUID(),
    ...formData,
    createdAt: props.connection?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// 保存処理
const handleSave = async () => {
  // Vuetify 3のvalidateは{ valid: boolean }を返す
  const result = await formRef.value?.validate();
  if (!result?.valid) {
    console.log('フォームのバリデーションエラー');
    return;
  }

  console.log('接続データを保存:', formData);

  savingConnection.value = true;

  const connectionData = buildConnectionData();

  console.log('保存するデータ:', connectionData);
  emit('save', connectionData);
};

// 保存完了通知を受け取る
const finishSaving = () => {
  savingConnection.value = false;
};

// キャンセル処理
const handleCancel = () => {
  emit('cancel');
};

// 接続テスト
const handleTestConnection = async () => {
  const result = await formRef.value?.validate();
  if (!result?.valid) {
    console.log('フォームのバリデーションエラー');
    return;
  }

  testingConnection.value = true;
  emit('test-connection', buildConnectionData());
};

// 接続テスト結果を親から受け取る
const finishTestConnection = () => {
  testingConnection.value = false;
};

// 初期化
initializeForm();

// エクスポート (親コンポーネントから呼び出せるメソッド)
defineExpose({
  finishTestConnection,
  finishSaving,
});
</script>
