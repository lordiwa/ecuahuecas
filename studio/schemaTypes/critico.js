import {defineField, defineType} from 'sanity'

// ecuahuecas analog of blog-component's `author`.
export default defineType({
  name: 'critico',
  title: 'Crítico',
  type: 'document',
  fields: [
    defineField({
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {source: 'nombre', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Foto',
      type: 'image',
      options: {hotspot: true},
      fields: [{name: 'alt', type: 'string', title: 'Texto alternativo'}],
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      of: [
        {
          title: 'Block',
          type: 'block',
          styles: [{title: 'Normal', value: 'normal'}],
          lists: [],
        },
      ],
    }),
    defineField({
      name: 'ciudad',
      title: 'Ciudad',
      type: 'string',
      options: {
        list: [
          {title: 'Quito', value: 'Quito'},
          {title: 'Guayaquil', value: 'Guayaquil'},
          {title: 'Cuenca', value: 'Cuenca'},
          {title: 'Manta', value: 'Manta'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'especialidad',
      title: 'Especialidad',
      type: 'string',
    }),
    defineField({
      name: 'desde',
      title: 'Desde (año)',
      type: 'number',
      validation: (Rule) => Rule.integer(),
    }),
    defineField({
      name: 'activo',
      title: 'Activo',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {title: 'nombre', subtitle: 'especialidad', media: 'image'},
  },
})
