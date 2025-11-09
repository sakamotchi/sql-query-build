import { createVuetify, type ThemeDefinition } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import type { ThemeType } from '@/types/theme';

const sharedColors = {
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  success: '#4CAF50',
  'on-surface': '#000000',
  'on-surface-variant': '#424242',
  outline: '#00000042',
} as const;

const developmentTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#4CAF50',
    secondary: '#66BB6A',
    background: '#F1F8E9',
    surface: '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#000000',
    'on-error': '#FFFFFF',
    ...sharedColors,
  },
};

const testTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#2196F3',
    secondary: '#42A5F5',
    background: '#E3F2FD',
    surface: '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#000000',
    'on-error': '#FFFFFF',
    ...sharedColors,
  },
};

const stagingTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#FF9800',
    secondary: '#FFA726',
    background: '#FFF3E0',
    surface: '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#000000',
    'on-background': '#000000',
    'on-error': '#FFFFFF',
    ...sharedColors,
  },
};

const productionTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#F44336',
    secondary: '#EF5350',
    background: '#FFEBEE',
    surface: '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#000000',
    'on-error': '#FFFFFF',
    ...sharedColors,
  },
};

const defaultTheme: ThemeType = 'development';

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme,
    themes: {
      development: developmentTheme,
      test: testTheme,
      staging: stagingTheme,
      production: productionTheme,
    },
  },
  defaults: {
    VBtn: {
      variant: 'elevated',
    },
    VCard: {
      elevation: 2,
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
});
