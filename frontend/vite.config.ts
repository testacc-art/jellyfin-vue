/* eslint-disable import/no-nodejs-modules */
import path, { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
/* eslint-enable import/no-nodejs-modules */
import { defineConfig, UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Pages from 'vite-plugin-pages';
import Layouts from 'vite-plugin-vue-layouts';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Components from 'unplugin-vue-components/vite';
import VueRouter from 'unplugin-vue-router/vite';
import {
  VueUseComponentsResolver,
  Vuetify3Resolver,
  VueUseDirectiveResolver
} from 'unplugin-vue-components/resolvers';
import { VitePWA } from 'vite-plugin-pwa';
import visualizer from 'rollup-plugin-visualizer';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const config: UserConfig = {
    server: {
      host: '0.0.0.0',
      port: 3000
    },
    define: {
      __COMMIT_HASH__: JSON.stringify(process.env.COMMIT_HASH || '')
    },
    plugins: [
      VueRouter({
        dts: './types/global/routes.d.ts'
      }),
      vue(),
      Pages({
        routeStyle: 'nuxt',
        importMode: 'sync',
        moduleId: 'virtual:generated-pages'
      }),
      Layouts({
        importMode: () => 'sync',
        defaultLayout: 'default'
      }),
      // This plugin allows to autoimport vue components
      Components({
        dts: './types/global/components.d.ts',
        /**
         * The icons resolver finds icons components from 'unplugin-icons' using this convenction:
         * {prefix}-{collection}-{icon} e.g. <i-mdi-thumb-up />
         */
        resolvers: [
          IconsResolver(),
          VueUseComponentsResolver(),
          Vuetify3Resolver(),
          VueUseDirectiveResolver()
        ]
      }),
      /**
       * This plugin allows to use all icons from Iconify as vue components
       * See: https://github.com/antfu/unplugin-icons
       */
      Icons({
        compiler: 'vue3',
        /**
         * Don't hardcode any size to the icons, let Vuetify or whatever CSS styles
         * we have applied to the object do the job instead.
         */
        scale: 0
      }),
      VitePWA(),
      VueI18nPlugin({
        runtimeOnly: true,
        compositionOnly: true,
        fullInstall: false,
        forceStringify: true,
        include: resolve(
          dirname(fileURLToPath(import.meta.url)),
          './locales/**'
        )
      })
    ],
    build: {
      /**
       * See main.ts for an explanation of this target
       */
      target: 'es2022',
      modulePreload: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('jassub-worker.wasm')) {
              return 'assets/jassub-worker.wasm';
            }

            return 'assets/[name]-[hash][extname]';
          },
          plugins: [
            mode === 'analyze'
              ? // rollup-plugin-visualizer
                // https://github.com/btd/rollup-plugin-visualizer
                visualizer({
                  open: true,
                  filename: 'dist/stats.html',
                  gzipSize: true,
                  brotliSize: true
                })
              : undefined
          ]
        }
      }
    },
    css: {
      postcss: {
        plugins: [autoprefixer()]
      }
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      cors: true
    },
    resolve: {
      alias: {
        '@/': `${path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          './src'
        )}/`
      }
    }
  };

  return config;
});
