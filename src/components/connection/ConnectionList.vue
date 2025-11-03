<template>
  <div class="connection-list">
    <!-- ローディング状態 -->
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
    ></v-progress-linear>

    <!-- 空状態 -->
    <v-sheet
      v-else-if="connections.length === 0"
      class="text-center pa-12"
      rounded
      border
    >
      <v-icon size="64" color="grey-lighten-1">mdi-database-off</v-icon>
      <div class="text-h6 mt-4 text-grey">登録された接続がありません</div>
      <div class="text-body-2 text-grey-darken-1 mt-2">
        「新規接続」ボタンから接続を追加してください
      </div>
    </v-sheet>

    <!-- 接続カードグリッド -->
    <v-row v-else>
      <v-col
        v-for="connection in connections"
        :key="connection.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <ConnectionCard
          :connection="connection"
          @select="$emit('select-connection', connection)"
          @edit="$emit('edit-connection', connection)"
          @delete="$emit('delete-connection', connection)"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { Connection } from '@/types/connection'
import ConnectionCard from './ConnectionCard.vue'

defineProps<{
  connections: Connection[]
  loading: boolean
}>()

defineEmits<{
  'select-connection': [connection: Connection]
  'edit-connection': [connection: Connection]
  'delete-connection': [connection: Connection]
}>()
</script>
