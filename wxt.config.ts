import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    default_locale: 'en',
    description: '__MSG_extension_description__',
    host_permissions: [
      'https://v0.dev/*',
    ],
    name: '__MSG_extension_name__',
    optional_host_permissions: [
      '*://*/*',
    ],
    permissions: [
      'storage',
      'webRequest',
      'contextMenus',
      'activeTab',
      'scripting',
    ],
  },
  modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/auto-icons',
    '@wxt-dev/i18n/module',
  ],
  srcDir: 'src',
})
