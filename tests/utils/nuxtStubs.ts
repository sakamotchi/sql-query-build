import { defineComponent, h } from 'vue'

const nuxtUiTags = [
  'UButton',
  'UBadge',
  'UIcon',
  'UInput',
  'USelect',
  'UCard',
  'UContainer',
  'UFormGroup',
  'UTooltip'
] as const

const createStubComponent = (name: string) =>
  defineComponent({
    name: `${name}Stub`,
    setup(_, { slots }) {
      return () => h('div', { class: 'nuxt-ui-stub', 'data-stub': name }, slots.default?.())
    }
  })

export const createNuxtUIStubs = () =>
  nuxtUiTags.reduce<Record<string, ReturnType<typeof defineComponent>>>((stubs, tag) => {
    stubs[tag] = createStubComponent(tag)
    return stubs
  }, {})
