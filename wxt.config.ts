import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    default_locale: 'en',
    description: '__MSG_extension_description__',
    host_permissions: [
      'https://v0.dev/chat/api/rate-limit*',
      'https://bolt.new/api/rate-limits*',
    ],
    name: '__MSG_extension_name__',
    permissions: [
      'storage',
      'webRequest',
    ],
  },
  modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/i18n/module',
  ],
  srcDir: 'src',
})
