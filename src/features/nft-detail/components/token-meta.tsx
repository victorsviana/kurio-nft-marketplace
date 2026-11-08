import type { NftDetail } from '@/shared/contracts'

/** "ID do token / Coleção / Atributos" block, 15/400 Color/Secondary (NFT-01). */
export function TokenMeta({ nft }: { nft: Pick<NftDetail, 'tokenId' | 'collection' | 'attributes'> }) {
  const rows = [
    { label: 'ID do token:', value: `#${nft.tokenId}` },
    { label: 'Coleção:', value: nft.collection },
    {
      label: 'Atributos:',
      value: nft.attributes.map((a) => (
        <span key={a.trait} title={a.trait}>
          {a.value}
        </span>
      )),
    },
  ]
  return (
    <dl className="flex flex-col gap-3 text-[15px] leading-5 text-fg-subtle">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="inline">{row.label}</dt>{' '}
          <dd className="inline">
            {Array.isArray(row.value)
              ? row.value.flatMap((node, i) => (i === 0 ? [node] : [', ', node]))
              : row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
