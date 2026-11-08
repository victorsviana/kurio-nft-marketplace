import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export const Route = createFileRoute('/nft/$nftId')({
  staticData: { section: 'mercado', headerDivider: false, mobileHeader: false },
  component: () => <PagePlaceholder title="Detalhes do NFT" requirement="NFT" />,
})
