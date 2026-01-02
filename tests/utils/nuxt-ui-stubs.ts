export const nuxtUiStubs = {
  UIcon: {
    template: '<i></i>',
    props: ['name'],
  },
  UButton: {
    template: '<button><slot /></button>',
    props: ['color', 'variant', 'icon', 'size', 'disabled', 'loading', 'label'],
  },
  UInput: {
    template: '<input />',
    props: ['modelValue', 'type', 'placeholder', 'disabled'],
  },
  USelect: {
    template: '<select><slot /></select>',
    props: ['modelValue', 'options', 'placeholder', 'disabled'],
  },
  UModal: {
    template: '<div><slot name="body" /><slot name="footer" /></div>',
    props: ['open', 'title', 'ui'],
  },
  UBadge: {
    template: '<div><slot /></div>',
    props: ['color', 'size', 'variant'],
  },
  UAlert: {
    template: '<div><slot name="title" /><slot /></div>',
    props: ['color', 'variant', 'icon'],
  },
}
