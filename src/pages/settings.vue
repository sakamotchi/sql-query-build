<template>
  <v-app>
    <v-app-bar color="surface" elevation="1">
      <v-btn icon="mdi-arrow-left" @click="handleBack" />
      <v-app-bar-title>設定</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container class="py-6">
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="security">
            <v-icon start>mdi-shield-lock</v-icon>
            セキュリティ
          </v-tab>
          <v-tab value="general">
            <v-icon start>mdi-cog</v-icon>
            一般
          </v-tab>
          <v-tab value="about">
            <v-icon start>mdi-information</v-icon>
            このアプリについて
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab" class="mt-6">
          <v-tabs-window-item value="security">
            <SecuritySettings />
          </v-tabs-window-item>

          <v-tabs-window-item value="general">
            <GeneralSettings />
          </v-tabs-window-item>

          <v-tabs-window-item value="about">
            <AboutSection />
          </v-tabs-window-item>
        </v-tabs-window>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import SecuritySettings from '@/components/settings/SecuritySettings.vue';
import GeneralSettings from '@/components/settings/GeneralSettings.vue';
import AboutSection from '@/components/settings/AboutSection.vue';

const activeTab = ref('security');

const handleBack = async () => {
  try {
    const currentWindow = getCurrentWindow();
    await currentWindow.close();
  } catch (error) {
    console.error('Failed to close window:', error);
    window.history.back();
  }
};
</script>
