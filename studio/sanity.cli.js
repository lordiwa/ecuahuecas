import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'gvc4yjqj',
    dataset: 'production',
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/cli#auto-updates
     */
    autoUpdates: true,
    /**
     * Hosted Studio hostname → https://ecuahuecas.sanity.studio
     * (set so `sanity deploy` is non-interactive).
     */
    studioHost: 'ecuahuecas',
    // Hosted Studio application id (from the first deploy) — keeps future
    // `sanity deploy` runs non-interactive. Studio: https://ecuahuecas.sanity.studio
    appId: 'cyy0gdj60bk9ef2wmycqpsm7',
  },
})
