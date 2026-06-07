<script setup lang="ts">
import { useRoute, RouterLink } from 'vue-router'
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { BlogPostPreview } from 'blog-component'
import { getResena, getHueca, getCritico } from '@/lib/content'
import { ogImageUrl, absoluteUrl } from '@/lib/og'
import Estrellas from '@/components/Estrellas.vue'
import PrecioDots from '@/components/PrecioDots.vue'
import Foto from '@/components/Foto.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const resena = computed(() => getResena(slug.value))
const hueca = computed(() => (resena.value ? getHueca(resena.value.hueca_id) : undefined))
const critico = computed(() => (resena.value ? getCritico(resena.value.critico_id) : undefined))

// PortableText `internalLink` slugs point at other reseñas → /resenas/:slug.
const resolveInternalHref = (s: string) => `/resenas/${s}`

// Google Maps "Cómo llegar" link, only meaningful when the hueca has coords.
const mapsHref = computed(() => {
  const c = hueca.value?.coords
  return c ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : undefined
})

// The hueca's own photo gallery (distinct from the reseña hero). De-dupe a foto
// that is literally the same URL as the hero to avoid showing it twice.
const galeria = computed(() => {
  const fotos = hueca.value?.fotos ?? []
  const hero = resena.value?.imagen
  return hero ? fotos.filter((f) => f !== hero) : fotos
})

// Per-page Open Graph. This is the most-shared page, so the og:image is the
// reseña's OWN uploaded photo (resena.imagen) transformed to a 1200x630 card;
// when absent it falls back to the branded static card. Overrides App.vue's
// defaults via unhead's property/name dedupe. All `content` values are strings
// (never undefined) so no malformed tags are emitted for missing data.
useHead(() => {
  const r = resena.value
  if (!r) {
    return { title: 'Reseña no encontrada — EcuaHuecas', meta: [] }
  }
  const desc = r.extracto || `Reseña de ${r.titulo} en EcuaHuecas.`
  const url = absoluteUrl(`/resenas/${r.slug}`)
  const image = ogImageUrl(r.imagen || undefined)
  return {
    title: `${r.titulo} — EcuaHuecas`,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:type', content: 'article' },
      { property: 'og:title', content: r.titulo },
      { property: 'og:description', content: desc },
      { property: 'og:image', content: image },
      { property: 'og:url', content: url },
      { name: 'twitter:title', content: r.titulo },
      { name: 'twitter:description', content: desc },
      { name: 'twitter:image', content: image },
    ],
  }
})
</script>

<template>
  <article v-if="resena" class="container section resena">
    <p class="eyebrow">{{ resena.fecha }} · por {{ critico?.nombre ?? '—' }}</p>
    <h1 class="h-display">{{ resena.titulo }}</h1>

    <!-- Crítico byline: avatar (or branded placeholder) + linked name + especialidad. -->
    <div v-if="critico" class="critico-byline">
      <img
        v-if="critico.avatar"
        :src="critico.avatar"
        alt=""
        loading="lazy"
        class="critico-byline__avatar"
      />
      <Foto v-else :seed="critico.slug" class="critico-byline__avatar" aspect="1/1" />
      <span class="critico-byline__texto">
        <RouterLink :to="`/criticos/${critico.slug}`" class="critico-byline__nombre">{{ critico.nombre }}</RouterLink>
        <span v-if="critico.especialidad" class="critico-byline__especialidad">{{ critico.especialidad }}</span>
      </span>
    </div>

    <p class="resena-meta">
      <Estrellas :value="resena.rating" />
      <span class="mono-meta">{{ resena.rating.toFixed(1) }}</span>
      <span v-if="hueca">· en <RouterLink :to="`/huecas/${hueca.slug}`">{{ hueca.nombre }}</RouterLink></span>
    </p>

    <!--
      TASK-028: the real uploaded hero photo shows at its NATURAL proportions
      (no crop/zoom). Render it as a plain image element so Foto's cover-crop
      box never applies; fall back to the branded Foto placeholder when there is
      no image (the placeholder keeps its decorative 16/9 box).
    -->
    <img
      v-if="resena.imagen"
      :src="resena.imagen"
      alt=""
      loading="lazy"
      class="resena-hero resena-hero--natural"
    />
    <Foto v-else :seed="resena.slug" :color="'#E8833A'" aspect="16/9" class="resena-hero" />

    <div class="resena-body cuerpo-editorial">
      <BlogPostPreview
        :body="resena.body"
        project-id="gvc4yjqj"
        dataset="production"
        :link-component="RouterLink"
        :resolve-internal-href="resolveInternalHref"
      />
    </div>

    <!-- Hueca info card: data, photo gallery and actions (omitted when no hueca). -->
    <section v-if="hueca" class="donde-comer">
      <h2 class="h-titulo">Dónde comer</h2>

      <div v-if="galeria.length" class="resena-galeria">
        <img
          v-for="(foto, i) in galeria"
          :key="foto"
          :src="foto"
          alt=""
          loading="lazy"
          class="resena-galeria__foto"
          :class="{ 'resena-galeria__foto--principal': i === 0 }"
        />
      </div>

      <dl class="hueca-datos">
        <div><dt>Plato estrella</dt><dd>{{ hueca.plato_estrella }}</dd></div>
        <div><dt>Precio</dt><dd><PrecioDots :value="hueca.precio" /></dd></div>
        <div><dt>Dirección</dt><dd>{{ hueca.direccion }}</dd></div>
        <div><dt>Zona</dt><dd>{{ hueca.barrio }}, {{ hueca.ciudad }}</dd></div>
        <div><dt>Horario</dt><dd>{{ hueca.horario }}</dd></div>
      </dl>

      <div class="donde-comer__acciones">
        <a
          v-if="mapsHref"
          :href="mapsHref"
          target="_blank"
          rel="noopener"
          class="btn"
        >Cómo llegar</a>
        <RouterLink :to="`/huecas/${hueca.slug}`" class="btn btn--ghost">Ver hueca</RouterLink>
      </div>
    </section>

    <aside v-if="resena.veredicto" class="veredicto">
      <h2 class="h-titulo">Veredicto</h2>
      <div class="veredicto-grid">
        <div v-if="resena.veredicto.aFavor.length">
          <p class="eyebrow">A favor</p>
          <ul><li v-for="(it, i) in resena.veredicto.aFavor" :key="`f-${i}`">{{ it }}</li></ul>
        </div>
        <div v-if="resena.veredicto.enContra.length">
          <p class="eyebrow">En contra</p>
          <ul><li v-for="(it, i) in resena.veredicto.enContra" :key="`c-${i}`">{{ it }}</li></ul>
        </div>
        <div v-if="resena.veredicto.ticket">
          <p class="eyebrow">Ticket</p>
          <p class="veredicto-ticket">{{ resena.veredicto.ticket }}</p>
        </div>
      </div>
    </aside>
  </article>

  <section v-else class="container section">
    <h1 class="h-display">Reseña no encontrada</h1>
    <RouterLink to="/" class="btn">Volver al inicio</RouterLink>
  </section>
</template>

<style scoped>
.resena { max-width: 760px; }
.resena-meta { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.mono-meta { font-family: var(--mono); font-size: 13px; }
.resena-meta a { color: var(--rojo); font-weight: 700; }
.resena-hero { margin: 32px 0; }
/* Real hero photo at natural proportions: full width, intrinsic height, no crop. */
.resena-hero--natural {
  width: 100%;
  height: auto;
  display: block;
  border: var(--borde);
  border-radius: var(--radio-md);
}
.resena-body { font-size: 1.25rem; line-height: 1.7; }
.resena-body :deep(p) { margin-block: 1em; }
.resena-body :deep(h2),
.resena-body :deep(h3) { font-family: var(--display); margin-top: 2em; }
.resena-body :deep(h2) { font-size: 1.6rem; }
.resena-body :deep(h3) { font-size: 1.3rem; }

/*
 * LIST-STYLE GOTCHA: the global reset (`* { margin: 0; padding: 0 }` in
 * src/styles/main.css) zeroes the padding that <ul>/<ol> use as their marker
 * gutter, so bullets/numbers render off-canvas (effectively invisible) on
 * PortableText lists. Re-assert both list-style AND the padding gutter within
 * the post-body scope. Scoped to .resena-body so other UI lists (cards, sheets)
 * keep their reset.
 */
.resena-body :deep(ul) { list-style: disc outside; padding-left: 1.5em; margin-block: 1em; }
.resena-body :deep(ol) { list-style: decimal outside; padding-left: 1.5em; margin-block: 1em; }
.resena-body :deep(li) { margin-block: 0.3em; }
.resena-body :deep(a) {
  color: var(--rojo);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
.resena-body :deep(blockquote) {
  border-left: 4px solid var(--rojo);
  padding: 0.2rem 0 0.2rem 1rem;
  margin-block: 1em;
  font-style: italic;
}

.veredicto {
  margin-top: 56px;
  padding: 28px;
  background: var(--amarillo);
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque);
}
.veredicto-grid {
  display: grid;
  gap: 20px;
  margin-top: 16px;
}
.veredicto ul { list-style: none; padding: 0; font-family: var(--titulo); }
.veredicto li { padding: 6px 0; border-bottom: 1px dashed var(--linea); }
.veredicto-ticket { font-family: var(--mono); font-weight: 500; }

/* Crítico byline: a compact avatar + linked name row under the title. */
.critico-byline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.critico-byline__avatar {
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  object-fit: cover;
  border: var(--borde);
  overflow: hidden;
}
.critico-byline__texto { display: flex; flex-direction: column; line-height: 1.2; }
.critico-byline__nombre { color: var(--rojo); font-weight: 700; font-family: var(--titulo); }
.critico-byline__especialidad { font-family: var(--mono); font-size: 12px; opacity: 0.8; }

/* "Dónde comer" card: hueca data + gallery + actions. */
.donde-comer {
  margin-top: 56px;
  padding: 28px;
  border: var(--borde);
  border-radius: var(--radio-md);
  box-shadow: var(--sombra-bloque);
}
.donde-comer .hueca-datos { display: grid; gap: 16px; margin-top: 20px; }
.donde-comer .hueca-datos dt { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--rojo); }
.donde-comer .hueca-datos dd { font-family: var(--titulo); font-size: 1.1rem; margin-top: 2px; }
.donde-comer__acciones { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
.btn--ghost { background: transparent; }

/*
 * Hueca photo gallery in the reseña. Mirrors HuecaDetail's natural-photo
 * pattern: full width, intrinsic height, no crop; the first photo spans the
 * full row. Distinct class names so the reseña scope owns its own styles.
 */
.resena-galeria {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 20px;
}
.resena-galeria__foto {
  width: 100%;
  height: auto;
  display: block;
  border: var(--borde);
  border-radius: var(--radio-md);
}
.resena-galeria__foto--principal { grid-column: 1 / -1; }
.resena-galeria:has(.resena-galeria__foto:only-child) { grid-template-columns: 1fr; }
</style>
