import fs from 'fs'
import path from 'path'
import { ref } from 'vue'
import { vi } from 'vitest'
import { config } from '@vue/test-utils'

type LocaleMessages = Record<string, unknown>
type LocaleCode = 'ja' | 'en'

const resolveLocalePath = (fileName: string): string => {
  const candidates = [
    path.resolve(process.cwd(), 'i18n', 'locales', fileName),
    path.resolve(process.cwd(), '..', 'i18n', 'locales', fileName),
  ]
  const match = candidates.find((candidate) => fs.existsSync(candidate))
  if (!match) {
    throw new Error(`Locale file not found: ${fileName}`)
  }
  return match
}

const loadMessages = (fileName: string): LocaleMessages => {
  const filePath = resolveLocalePath(fileName)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LocaleMessages
}

const messages: Record<LocaleCode, LocaleMessages> = {
  ja: loadMessages('ja.json'),
  en: loadMessages('en.json'),
}

const locale = ref<LocaleCode>('ja')
const colorMode = ref('light')

const resolveMessage = (key: string, target: LocaleMessages): string | undefined => {
  return key.split('.').reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null) {
      return undefined
    }
    return (current as Record<string, unknown>)[part]
  }, target) as string | undefined
}

const interpolate = (message: string, params?: Record<string, string | number>): string => {
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (_, token) => {
    const value = params[token]
    return value === undefined ? `{${token}}` : String(value)
  })
}

const t = (key: string, params?: Record<string, string | number>): string => {
  const primary = messages[locale.value]
  const fallback = messages.en
  const message = resolveMessage(key, primary) ?? resolveMessage(key, fallback) ?? key
  return typeof message === 'string' ? interpolate(message, params) : String(message)
}

config.global.mocks = {
  ...(config.global.mocks ?? {}),
  $t: t,
}

const setLocale = async (nextLocale: string) => {
  if (nextLocale === 'ja' || nextLocale === 'en') {
    locale.value = nextLocale
  } else {
    locale.value = 'ja'
  }
}

function useI18n() {
  return {
    t,
    locale,
    setLocale,
  }
}

import { useNuxtApp, useState, useToast, useColorMode, useAppConfig } from './mocks/nuxt-app'

vi.stubGlobal('useI18n', useI18n)
vi.stubGlobal('useColorMode', useColorMode)

vi.mock('vue-i18n', () => ({
  useI18n,
}))

vi.stubGlobal('useToast', useToast)
vi.stubGlobal('useNuxtApp', useNuxtApp)
vi.stubGlobal('useState', useState)
vi.stubGlobal('useAppConfig', useAppConfig)

vi.mock('#imports', async () => {
  const mocks = await import('./mocks/nuxt-app')
  return {
    ...mocks,
    useI18n,
  }
})

vi.mock('nuxt/app', async () => {
  const mocks = await import('./mocks/nuxt-app')
  return {
    ...mocks,
    useI18n,
  }
})

vi.mock('@nuxtjs/color-mode/dist/runtime/composables', async () => {
  return {
    useColorMode,
  }
})

vi.mock('@nuxtjs/color-mode/dist/runtime/composables.js', async () => {
  return {
    useColorMode,
  }
})
