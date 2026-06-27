import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

interface OgData {
  title: string | null
  description: string | null
  image: string | null
  url: string
  domain: string
}

function extractMeta(doc: Document, url: string): OgData {
  const get = (prop: string) => {
    const el = doc.querySelector(`meta[property="${prop}"]`) || doc.querySelector(`meta[name="${prop}"]`)
    return el?.getAttribute('content') || null
  }

  const title = get('og:title') || doc.querySelector('title')?.textContent || null
  const description = get('og:description') || get('description') || null
  let image = get('og:image') || null

  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, url).href
    } catch {}
  }

  return {
    title,
    description,
    image,
    url,
    domain: new URL(url).hostname,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return json({ error: 'URL is required' }, 400)
    }

    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return json({ error: 'Invalid URL protocol' }, 400)
    }

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })

    const html = await resp.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const data = extractMeta(doc, url)

    return json({ success: true, data })
  } catch (err) {
    console.error('link-preview error:', err)
    return json({ success: false, error: err?.message || 'Failed to fetch preview' })
  }
})
