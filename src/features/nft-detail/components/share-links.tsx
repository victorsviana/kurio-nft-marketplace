import { useId } from 'react'
import iconLinkedin from '../assets/share-linkedin.svg'
import iconMessage from '../assets/share-message.svg'
import iconTwitter from '../assets/share-twitter.svg'
import { shareTargets } from '../lib/share'

/** "Compartilhar este NFT" with real share URLs (LinkedIn, e-mail, Twitter/X). */
export function ShareLinks({ nftId, name, collection }: { nftId: string; name: string; collection: string }) {
  const labelId = useId()
  const url = `${window.location.origin}/nft/${encodeURIComponent(nftId)}`
  const targets = shareTargets({ url, name, collection })
  const linkClass =
    '-m-1 grid place-items-center rounded-sm p-1 text-fg opacity-100 transition-opacity hover:opacity-75'

  return (
    <div className="flex items-center gap-2">
      <p id={labelId} className="text-[15px] leading-4 font-bold text-fg">
        Compartilhar este NFT:
      </p>
      <ul aria-labelledby={labelId} className="flex items-center gap-2">
        <li className="flex">
          <a
            href={targets.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Compartilhar no LinkedIn (abre em nova aba)"
          >
            <img src={iconLinkedin} alt="" width={15} height={14.375} />
          </a>
        </li>
        <li className="flex">
          <a href={targets.email} className={linkClass} aria-label="Compartilhar por e-mail">
            <img src={iconMessage} alt="" width={18} height={18} />
          </a>
        </li>
        <li className="flex">
          <a
            href={targets.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="Compartilhar no Twitter (abre em nova aba)"
          >
            <img src={iconTwitter} alt="" width={16} height={12.19} />
          </a>
        </li>
      </ul>
    </div>
  )
}
