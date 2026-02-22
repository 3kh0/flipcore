import tailwindcss from "@tailwindcss/vite";
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  nitro: {
    output: { dir: 'dist' },
    preset: 'static',
  },
  css: [
    '@/assets/index.css',
  ],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
