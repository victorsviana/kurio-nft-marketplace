/** Real share targets for "Compartilhar este NFT" (LinkedIn, e-mail, Twitter/X). */
export function shareTargets(input: { url: string; name: string; collection: string }) {
  const url = encodeURIComponent(input.url)
  const text = encodeURIComponent(`${input.name} — coleção ${input.collection} na Kurio`)
  return {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    email: `mailto:?subject=${text}&body=${encodeURIComponent(`Veja este NFT na Kurio: ${input.url}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  }
}
