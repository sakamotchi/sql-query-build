import { defineComponent, h } from 'vue';

const vuetifyTags = [
  'v-app',
  'v-main',
  'v-app-bar',
  'v-app-bar-title',
  'v-alert',
  'v-avatar',
  'v-badge',
  'v-btn',
  'v-card',
  'v-card-title',
  'v-card-subtitle',
  'v-card-text',
  'v-card-actions',
  'v-chip',
  'v-chip-group',
  'v-container',
  'v-dialog',
  'v-divider',
  'v-icon',
  'v-label',
  'v-progress-circular',
  'v-radio',
  'v-radio-group',
  'v-row',
  'v-col',
  'v-sheet',
  'v-spacer',
  'v-toolbar-title',
] as const;

const toPascalCase = (tag: string) =>
  tag
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');

const createStubComponent = (tag: string) =>
  defineComponent({
    name: `${toPascalCase(tag)}Stub`,
    setup(_, { slots }) {
      return () =>
        h(
          tag,
          {
            class: 'vuetify-stub',
            'data-vuetify-stub': tag,
          },
          slots.default ? slots.default() : undefined
        );
    },
  });

export const createVuetifyStubs = () =>
  vuetifyTags.reduce<Record<string, ReturnType<typeof defineComponent>>>((stubs, tag) => {
    stubs[tag] = createStubComponent(tag);
    return stubs;
  }, {});
