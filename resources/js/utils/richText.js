/** Plain-text preview of a rich text (HTML) description, e.g. for line-clamped list previews. */
export function descriptionPreviewText(html) {
    if (!html) return '';
    const withImageMarkers = String(html).replace(/<img[^>]*>/gi, ' [Gambar] ');
    const div = document.createElement('div');
    div.innerHTML = withImageMarkers;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}
