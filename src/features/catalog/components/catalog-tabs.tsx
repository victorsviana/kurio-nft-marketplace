import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CATALOG_TABS, type CatalogTab } from '@/shared/contracts'
import { DEFAULT_TAB, TAB_LABELS } from '../lib/search'

/**
 * "Todos os NFTs / Novos lançamentos / Em alta" → `?tab=` (CAT-03). Manual activation: arrow
 * keys move focus, Enter/Space selects, so browsing the tabs does not fire a request per key.
 * The results are the content of the active tab, so `aria-controls` points to a real panel.
 */
export function CatalogTabs({
  value,
  onChange,
  toolbarEnd,
  children,
}: {
  value: CatalogTab | undefined
  onChange: (tab: CatalogTab) => void
  toolbarEnd?: ReactNode
  children: ReactNode
}) {
  const current = value ?? DEFAULT_TAB
  return (
    <TabsPrimitive.Root
      value={current}
      onValueChange={(v) => onChange(v as CatalogTab)}
      activationMode="manual"
      className="flex flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <TabsPrimitive.List aria-label="Lançamentos" className="-m-1 flex min-w-0 gap-x-3 overflow-x-auto p-1 md:gap-x-5">
          {CATALOG_TABS.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab}
              value={tab}
              className={cn(
                'relative shrink-0 rounded-sm pb-1 text-sm leading-4 whitespace-nowrap text-fg transition-colors hover:text-brand-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:text-[15px] md:font-medium',
                'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand after:opacity-0 data-[state=active]:font-bold data-[state=active]:text-brand-text data-[state=active]:after:opacity-100 md:data-[state=active]:font-medium',
              )}
            >
              {TAB_LABELS[tab]}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        {toolbarEnd}
      </div>
      <TabsPrimitive.Content value={current} className="outline-none" tabIndex={-1}>
        {children}
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  )
}
