import { http, HttpResponse } from 'msw'
import { catalogSearchSchema } from '@/shared/contracts'
import { queryCatalog, relatedTo, toDetail, toSummary } from '../domain/catalog'
import { db } from '../db/store'
import { api, apiError } from '../lib/http'
import { getScenario } from '../scenarios/engine'

export const nftHandlers = [
  http.get(api('/nfts'), ({ request }) => {
    // The API reads the same schema the router uses for the URL (CAT-06).
    const params = catalogSearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams))
    return HttpResponse.json(queryCatalog(db().nfts, params, { empty: getScenario().catalogEmpty }))
  }),

  http.get(api('/nfts/featured'), () => {
    const nfts = db().nfts
    const hero = nfts.find((n) => n.id === 'emerald-ape-042') ?? nfts[0]
    const spotlight = nfts.find((n) => n.id === 'sage-nomad-009') ?? nfts[1]
    if (!hero || !spotlight) return apiError(404, 'NOT_FOUND', 'Nenhum destaque disponível.')
    return HttpResponse.json({ hero: toSummary(hero), spotlight: toSummary(spotlight) })
  }),

  http.get(api('/nfts/:nftId/related'), ({ params }) => {
    const nft = db().nfts.find((n) => n.id === params.nftId)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json({ items: relatedTo(db().nfts, nft) })
  }),

  http.get(api('/nfts/:nftId'), ({ params }) => {
    const nft = db().nfts.find((n) => n.id === params.nftId)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(toDetail(nft))
  }),
]
