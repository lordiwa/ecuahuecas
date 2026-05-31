import {defineField, defineType} from 'sanity'

const CIUDADES = [
  {title: 'Quito', value: 'Quito'},
  {title: 'Guayaquil', value: 'Guayaquil'},
  {title: 'Cuenca', value: 'Cuenca'},
  {title: 'Manta', value: 'Manta'},
]

export default defineType({
  name: 'hueca',
  title: 'Hueca',
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
      name: 'ciudad',
      title: 'Ciudad',
      type: 'string',
      options: {list: CIUDADES, layout: 'radio'},
    }),
    defineField({
      name: 'barrio',
      title: 'Barrio',
      type: 'string',
    }),
    defineField({
      name: 'direccion',
      title: 'Dirección',
      type: 'string',
    }),
    defineField({
      name: 'plato_estrella',
      title: 'Plato estrella',
      type: 'string',
    }),
    defineField({
      name: 'precio',
      title: 'Precio',
      type: 'string',
      options: {
        list: [
          {title: '$', value: '$'},
          {title: '$$', value: '$$'},
          {title: '$$$', value: '$$$'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(5),
    }),
    defineField({
      name: 'reviews',
      title: 'Número de reseñas',
      type: 'number',
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: 'horario',
      title: 'Horario',
      type: 'string',
    }),
    defineField({
      name: 'desde',
      title: 'Desde (año)',
      type: 'number',
      description: 'Año en que abrió la hueca.',
      validation: (Rule) => Rule.integer(),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'fotos',
      title: 'Fotos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {hotspot: true},
          fields: [{name: 'alt', type: 'string', title: 'Texto alternativo'}],
        },
      ],
    }),
    defineField({
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'coords',
      title: 'Coordenadas',
      type: 'object',
      fields: [
        {
          name: 'lat',
          title: 'Latitud',
          type: 'number',
          validation: (Rule) => Rule.min(-90).max(90),
        },
        {
          name: 'lng',
          title: 'Longitud',
          type: 'number',
          validation: (Rule) => Rule.min(-180).max(180),
        },
      ],
    }),
    defineField({
      name: 'activa',
      title: 'Activa',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {title: 'nombre', subtitle: 'ciudad', media: 'fotos.0'},
  },
})
