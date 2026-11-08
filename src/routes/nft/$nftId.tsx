import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/nft/$nftId')({
  component: () => <PagePlaceholder title="Detalhes do NFT" requirement="NFT" />,
})
