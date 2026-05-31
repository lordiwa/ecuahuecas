import {defineField, defineType} from 'sanity'

// ecuahuecas analog of blog-component's `post`.
export default defineType({
  name: 'resena',
  title: 'Reseña',
  type: 'document',
  fields: [
    defineField({
      name: 'titulo',
      title: 'Título',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {source: 'titulo', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'hueca',
      title: 'Hueca',
      type: 'reference',
      to: [{type: 'hueca'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'critico',
      title: 'Crítico',
      type: 'reference',
      to: [{type: 'critico'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Fecha de publicación',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      validation: (Rule) => Rule.min(1).max(5),
    }),
    defineField({
      name: 'extracto',
      title: 'Extracto / resumen',
      type: 'text',
      rows: 3,
      description: 'Resumen corto que aparece en la card del listado.',
      validation: (Rule) => Rule.max(280),
    }),
    defineField({
      name: 'body',
      title: 'Cuerpo de la reseña',
      type: 'blockContent',
    }),
    defineField({
      name: 'veredicto',
      title: 'Veredicto',
      type: 'object',
      fields: [
        {
          name: 'aFavor',
          title: 'A favor',
          type: 'array',
          of: [{type: 'string'}],
        },
        {
          name: 'enContra',
          title: 'En contra',
          type: 'array',
          of: [{type: 'string'}],
        },
        {
          name: 'ticket',
          title: 'Ticket (precio pagado)',
          type: 'string',
        },
      ],
    }),
    defineField({
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Texto alternativo'}],
    }),
    defineField({
      name: 'activa',
      title: 'Activa',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'featured',
      title: 'Destacada',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'titulo',
      hueca: 'hueca.nombre',
      featured: 'featured',
      media: 'imagen',
    },
    prepare({title, hueca, featured, media}) {
      return {
        title: `${featured ? '⭐ ' : ''}${title}`,
        subtitle: hueca && `en ${hueca}`,
        media,
      }
    },
  },
})
