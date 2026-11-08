import { useId, useState, type FormEvent } from 'react'
import iconSearch from '@/assets/icons/icon-search-mobile.svg'

/**
 * Search field of Mobile / Início (313 × 45). The draft text is the only local state; submit
 * writes `?q=` (CAT-02). Mount it with `key` = current `q` so back/forward refreshes the text.
 */
export function MobileSearch({ initialValue, onSubmit }: { initialValue: string; onSubmit: (q: string) => void }) {
  const [draft, setDraft] = useState(initialValue)
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(draft)
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className="flex h-[45px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-surface pr-3 pl-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
    >
      <img src={iconSearch} alt="" aria-hidden="true" width={22} height={22} />
      <label htmlFor={inputId} className="sr-only">
        Buscar NFTs
      </label>
      <input
        id={inputId}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={80}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Explorar coleções"
        className="h-full min-w-0 flex-1 bg-transparent text-sm leading-4 font-bold text-fg placeholder:text-fg-subtle focus-visible:outline-none"
      />
    </form>
  )
}
