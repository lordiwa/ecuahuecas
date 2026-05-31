import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'ecuahuecas-studio',

  // Shares the same Sanity project/dataset as blog-component, but is a
  // separate Studio so the two content models stay decoupled.
  projectId: 'gvc4yjqj',
  dataset: 'production',

  plugins: [structureTool(), visionTool()],

  document: {
    comments: {enabled: true},
  },

  schema: {
    types: schemaTypes,
  },
})
