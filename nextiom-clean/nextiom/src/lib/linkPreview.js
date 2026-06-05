const PREVIEW_CACHE = new Map();

export async function fetchLinkPreview(url) {
  if (PREVIEW_CACHE.has(url)) return PREVIEW_CACHE.get(url);

  try {
    let data;
    try {
      const resp = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(url)}&timeout=5000`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success' && json.data) {
          data = {
            title: json.data.title || null,
            description: json.data.description || null,
            image: json.data.image?.url || json.data.logo?.url || null,
            url: json.data.url || url,
            domain: new URL(url).hostname,
          };
        }
      }
    } catch {}

    if (!data) {
      data = { title: null, description: null, image: null, url, domain: new URL(url).hostname };
    }

    PREVIEW_CACHE.set(url, data);
    return data;
  } catch {
    return { title: null, description: null, image: null, url, domain: new URL(url).hostname };
  }
}

export function extractUrls(text) {
  const urls = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    urls.push(match[2]);
  }
  return urls;
}
