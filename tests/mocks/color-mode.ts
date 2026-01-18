import { ref } from 'vue'

const colorMode = ref('light')

export const useColorMode = () => colorMode
