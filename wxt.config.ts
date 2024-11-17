import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    default_locale: 'en',
    description: '__MSG_extension_description__',
    host_permissions: [
      'https://v0.dev/*',
      'https://bolt.new/*',
      'https://www.recraft.ai/*',
      'https://api.recraft.ai/*',
    ],
    name: '__MSG_extension_name__',
    permissions: [
      'storage',
      'webRequest',
    ],
  },
  modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/auto-icons',
    '@wxt-dev/i18n/module',
  ],
  srcDir: 'src',
})
