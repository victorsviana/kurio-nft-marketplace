import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, PlugZap, XCircle } from 'lucide-react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useId } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MaskIcon } from '@/components/ui/mask-icon'
import { cn } from '@/lib/utils'
import { NETWORK_LABELS, WALLET_KIND_LABELS, type Wallet, type WalletKind, type WalletSlot } from '@/shared/contracts'
import { shortAddress } from '@/shared/lib/format'
import iconKebab from '../assets/icon-kebab.svg'
import iconWallet from '../assets/icon-wallet.svg'
import type { CheckoutController } from '../lib/use-checkout'

/** Connector options of "Carteira e rede", in the Figma order. Bound to the same `walletKind` as the select. */
const CONNECTORS: readonly WalletKind[] = ['walletconnect', 'metamask', 'coinbase']
export const CONNECTOR_GROUP_ID = 'checkout-connectors'

/** Radio dot drawn with CSS (Figma radio-16 / radio-selected-frame). */
function RadioDot({ tone = 'brand' }: { tone?: 'brand' | 'soft' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-4 shrink-0 place-content-center rounded-full border-[1.2px]',
        tone === 'brand' ? 'border-brand' : 'border-line-soft group-data-[state=checked]:border-brand',
        'before:size-2 before:scale-0 before:rounded-full before:bg-brand before:transition-transform group-data-[state=checked]:before:scale-100',
      )}
    />
  )
}

export function ConnectorOptions({
  checkout,
  variant,
  disabled,
}: {
  checkout: CheckoutController
  variant: 'desktop' | 'mobile'
  disabled?: boolean
}) {
  const titleId = useId()
  const value = checkout.form.values.walletKind
  const desktop = variant === 'desktop'
  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col', desktop ? 'gap-5' : 'gap-4')}>
      <h2 id={titleId} className={cn('leading-4 font-bold text-fg', desktop ? 'text-center text-[17px]' : 'text-base')}>
        Carteira e rede
      </h2>
      <RadioGroupPrimitive.Root
        id={CONNECTOR_GROUP_ID}
        aria-labelledby={titleId}
        value={value || undefined}
        onValueChange={(kind) => checkout.setWalletKind(kind as WalletKind)}
        disabled={disabled}
        className="flex flex-col gap-4"
      >
        {CONNECTORS.map((kind) =>
          desktop ? <DesktopConnector key={kind} kind={kind} /> : <MobileConnector key={kind} kind={kind} />,
        )}
      </RadioGroupPrimitive.Root>
    </section>
  )
}

const itemFocus =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60'

function DesktopConnector({ kind }: { kind: WalletKind }) {
  return (
    <RadioGroupPrimitive.Item
      value={kind}
      aria-label={WALLET_KIND_LABELS[kind]}
      className={cn(
        'group flex h-[45px] w-full items-center gap-2.5 rounded-[3px] border border-line pl-3 text-left transition-colors',
        'hover:border-line-soft data-[state=checked]:gap-3 data-[state=checked]:border-brand data-[state=checked]:pl-4',
        itemFocus,
      )}
    >
      <RadioDot />
      {kind === 'walletconnect' ? (
        <span
          aria-hidden="true"
          className="inline-flex h-[26px] max-w-[calc(100%-40px)] items-center gap-1.5 overflow-hidden rounded-md border border-line-soft bg-surface-dark px-2 text-[9px] leading-none font-bold tracking-[0.1px] whitespace-nowrap text-brand-text"
        >
          METAMASK <span>•</span> WALLETCONNECT <span>•</span> COINBASE
        </span>
      ) : (
        <span className="text-[15px] leading-4 text-fg">{WALLET_KIND_LABELS[kind]}</span>
      )}
    </RadioGroupPrimitive.Item>
  )
}

function MobileConnector({ kind }: { kind: WalletKind }) {
  return (
    <RadioGroupPrimitive.Item
      value={kind}
      aria-label={WALLET_KIND_LABELS[kind]}
      className={cn(
        'group flex h-[65px] w-full items-center gap-3 rounded-[15px] bg-surface pr-4 pl-3.5 text-left shadow-[0_0_20px_rgba(10,6,4,0.45)]',
        'data-[state=checked]:ring-1 data-[state=checked]:ring-brand/40',
        itemFocus,
      )}
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-content-center rounded-full border border-line bg-surface-raised text-sm font-bold text-brand-text">
        {kind === 'coinbase' ? <MaskIcon src={iconWallet} width={20} height={19} className="text-brand" /> : kind === 'walletconnect' ? 'W' : 'M'}
      </span>
      <span className="flex-1 text-sm leading-4 text-fg">{WALLET_KIND_LABELS[kind]}</span>
      <RadioDot tone="soft" />
    </RadioGroupPrimitive.Item>
  )
}

/** CHK-03: connection / refusal / disconnection of the selected wallet, with text (not only color). */
export function ConnectionStatus({ checkout }: { checkout: CheckoutController }) {
  const { connection, wallet, network, form } = checkout
  if (!wallet) return null
  const kind = form.values.walletKind as WalletKind
  const kindLabel = WALLET_KIND_LABELS[kind] ?? 'Carteira'
  const focusConnectors = () => {
    const group = document.getElementById(CONNECTOR_GROUP_ID)
    const target = group?.querySelector<HTMLElement>('[data-state="checked"]') ?? group?.querySelector<HTMLElement>('button')
    target?.focus()
  }

  switch (connection.status) {
    case 'idle':
      return (
        <p className="text-[13px] leading-5 text-fg-subtle" data-testid="connection-status">
          A carteira {kindLabel} ({shortAddress(wallet.address)}) será conectada na rede {NETWORK_LABELS[network]} ao confirmar.
        </p>
      )
    case 'connecting':
      return (
        <p className="flex items-center gap-2 text-sm leading-5 text-fg" data-testid="connection-status">
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-brand motion-reduce:animate-none" />
          Conectando carteira…
        </p>
      )
    case 'connected':
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-success/40 px-3 py-2" data-testid="connection-status">
          <p className="flex items-center gap-2 text-sm leading-5 text-fg">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
            Carteira conectada: {kindLabel} · {shortAddress(wallet.address)} · {NETWORK_LABELS[network]}
          </p>
          <button
            type="button"
            onClick={() => void checkout.disconnect()}
            className="text-sm font-bold text-brand-text underline-offset-4 hover:underline"
          >
            Desconectar
          </button>
        </div>
      )
    case 'disconnected':
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-line-soft px-3 py-2" data-testid="connection-status">
          <p className="flex items-center gap-2 text-sm leading-5 text-fg">
            <PlugZap aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
            Carteira desconectada. Ela será conectada novamente ao confirmar.
          </p>
          <button
            type="button"
            onClick={() => void checkout.connect()}
            className="text-sm font-bold text-brand-text underline-offset-4 hover:underline"
          >
            Conectar
          </button>
        </div>
      )
    case 'rejected':
    case 'error':
      return (
        <div className="flex flex-col gap-2 rounded-[3px] border border-danger/60 px-3 py-2" data-testid="connection-status">
          <p className="flex items-start gap-2 text-sm leading-5 text-fg">
            <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            {connection.message}
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => void checkout.connect()}
              className="text-sm font-bold text-brand-text underline-offset-4 hover:underline"
            >
              Tentar novamente
            </button>
            <button type="button" onClick={focusConnectors} className="text-sm font-bold text-fg underline-offset-4 hover:underline">
              Escolher outra carteira
            </button>
          </div>
        </div>
      )
  }
}

/* ------------------------------ mobile wallet cards ------------------------------ */

const SLOT_NAMES: Record<WalletSlot, string> = { primary: 'Principal', secondary: 'Reserva' }

/** "Carteira conectada" (mobile frame): registered wallets as radio cards, secondary first like the Figma. */
export function WalletCards({ checkout, disabled }: { checkout: CheckoutController; disabled?: boolean }) {
  const titleId = useId()
  const { wallets, form } = checkout
  const cards = [wallets.secondary, wallets.primary].filter((w): w is Wallet => Boolean(w))
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-base leading-4 font-bold text-fg">
          Carteira conectada
        </h2>
        <Link to="/account/wallets" preload={false} className="text-sm leading-4 font-bold text-brand-text hover:underline">
          Trocar carteira
        </Link>
      </div>
      <RadioGroupPrimitive.Root
        aria-labelledby={titleId}
        value={form.slot}
        onValueChange={(slot) => checkout.setSlot(slot as WalletSlot)}
        disabled={disabled}
        className="flex flex-col gap-5"
      >
        {cards.map((wallet) => (
          <WalletCard key={wallet.id} wallet={wallet} selected={form.slot === wallet.slot} />
        ))}
      </RadioGroupPrimitive.Root>
      {!wallets.secondary && (
        <p className="text-[13px] leading-5 text-fg-subtle">
          Sem carteira reserva cadastrada.{' '}
          <Link to="/account/wallets" preload={false} className="font-bold text-brand-text hover:underline">
            Cadastrar carteira
          </Link>
        </p>
      )}
    </section>
  )
}

function WalletCard({ wallet, selected }: { wallet: Wallet; selected: boolean }) {
  const name = wallet.label || SLOT_NAMES[wallet.slot]
  return (
    <div
      className={cn(
        'relative flex min-h-[93px] items-start rounded-[14px] bg-surface',
        selected && 'shadow-[0_20px_20px_rgba(10,6,4,0.45)]',
      )}
    >
      <RadioGroupPrimitive.Item
        value={wallet.slot}
        aria-label={`${name}: ${shortAddress(wallet.address)}, rede ${NETWORK_LABELS[wallet.network]}`}
        className={cn('group flex w-full items-start gap-[19px] rounded-[14px] py-[15px] pr-12 pl-[19px] text-left', itemFocus)}
      >
        <span className="mt-6">
          <RadioDot tone="soft" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-base leading-4 font-bold text-fg">{name}</span>
          <span className="mt-1.5 truncate text-sm leading-[22px] text-fg-muted">{shortAddress(wallet.address)}</span>
          <span className="text-sm leading-[22px] text-fg-muted">
            Rede {wallet.slot === 'primary' ? 'principal ' : ''}
            {NETWORK_LABELS[wallet.network]}
          </span>
        </span>
      </RadioGroupPrimitive.Item>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Opções da carteira ${name}`}
          className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-content-center rounded-full text-fg-subtle hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ring"
        >
          <MaskIcon src={iconKebab} width={3} height={15} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border border-line-soft bg-surface">
          <DropdownMenuItem asChild>
            <Link to="/account/wallets" preload={false}>
              Editar carteira
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
