import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { NETWORK_LABELS, NETWORKS, WALLET_KIND_LABELS, walletKindSchema, type Network, type Wallet, type WalletKind } from '@/shared/contracts'
import { shortAddress } from '@/shared/lib/format'
import type { CheckoutController } from '../lib/use-checkout'
import { SelectField, TextAreaField, TextField } from './fields'

const NETWORK_OPTIONS = NETWORKS.map((value) => ({ value, label: NETWORK_LABELS[value] }))
const KIND_OPTIONS = walletKindSchema.options.map((value) => ({ value, label: WALLET_KIND_LABELS[value] }))
const ENS_OPTIONS = [{ value: '.eth', label: '.eth' }]

/**
 * "Perfil do colecionador" (CHK-02, WAL-03). Desktop: the two columns of the Figma, laid out as a
 * row-major grid so each row stays aligned when an error message appears. Mobile: one column
 * inside the collapsible "Dados do colecionador" section.
 */
export function CollectorForm({ checkout, columns, disabled }: { checkout: CheckoutController; columns: 1 | 2; disabled?: boolean }) {
  const { form, errors, fieldId, errorId, setValue } = checkout
  const v = form.values
  const common = (field: Parameters<typeof fieldId>[0]) => ({
    id: fieldId(field),
    errorId: errorId(field),
    error: errors[field],
    disabled,
  })
  const twoColumns = columns === 2

  return (
    <div className="flex flex-col gap-6">
      <div className={cn('grid gap-x-6 gap-y-3', twoColumns ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        <TextField
          {...common('displayName')}
          label="Nome de exibição"
          required
          autoComplete="name"
          value={v.displayName}
          onValueChange={(value) => setValue('displayName', value)}
        />
        <TextField
          {...common('username')}
          label="Nome de usuário"
          required
          autoComplete="username"
          value={v.username}
          onValueChange={(value) => setValue('username', value)}
        />
        <SelectField
          {...common('network')}
          label="Rede"
          required
          placeholder="Selecione uma rede"
          value={form.network}
          options={NETWORK_OPTIONS}
          onValueChange={(value) => checkout.setNetwork(value as Network)}
        />
        <TextField
          {...common('profileName')}
          label="Nome do perfil"
          required
          value={v.profileName}
          onValueChange={(value) => setValue('profileName', value)}
        />
        <TextField
          {...common('walletAddress')}
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          spellCheck={false}
          autoComplete="off"
          className="[&_input]:pl-[22px]"
          value={v.walletAddress}
          onValueChange={(value) => setValue('walletAddress', value)}
        />
        <TextField
          {...common('secondaryReference')}
          label="ENS ou carteira secundária (opcional)"
          hiddenLabel
          reserveLabelSpace={twoColumns}
          placeholder="ENS ou carteira secundária (opcional)"
          spellCheck={false}
          autoComplete="off"
          className="[&_input]:pl-[22px]"
          value={v.secondaryReference}
          onValueChange={(value) => setValue('secondaryReference', value)}
        />
        <SelectField
          {...common('walletKind')}
          label="Tipo de carteira"
          required
          placeholder="Selecione uma carteira"
          value={v.walletKind}
          options={KIND_OPTIONS}
          onValueChange={(value) => checkout.setWalletKind(value as WalletKind)}
        />
        {/* Required in the Figma; optional here so buyers without a referral are not blocked. */}
        <TextField
          {...common('referralCode')}
          label="Código de indicação"
          autoComplete="off"
          value={v.referralCode}
          onValueChange={(value) => setValue('referralCode', value)}
        />
        <TextField
          {...common('email')}
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          value={v.email}
          onValueChange={(value) => setValue('email', value)}
        />
        <SelectField
          {...common('ensSuffix')}
          label="Nome ENS"
          required
          compact
          value={v.ensSuffix}
          options={ENS_OPTIONS}
          onValueChange={(value) => setValue('ensSuffix', value)}
        />
      </div>

      <OtherWalletToggle checkout={checkout} disabled={disabled} />

      <TextAreaField
        {...common('note')}
        label="Observação do colecionador (opcional)"
        className={twoColumns ? 'max-w-[350px]' : undefined}
        value={v.note}
        onValueChange={(value) => setValue('note', value)}
      />
    </div>
  )
}

const walletDescription = (wallet: Wallet) =>
  `${wallet.label ? `${wallet.label} · ` : ''}${WALLET_KIND_LABELS[wallet.kind]} · ${shortAddress(wallet.address)}`

/** "Usar outra carteira?" (Figma radio 15): switches between the primary and the secondary wallet. */
function OtherWalletToggle({ checkout, disabled }: { checkout: CheckoutController; disabled?: boolean }) {
  const hintId = useId()
  const { wallets, form } = checkout
  const other = form.slot === 'primary' ? wallets.secondary : wallets.primary
  const checked = form.slot === 'secondary'
  const otherAvailable = Boolean(other)
  return (
    <div className="flex flex-col gap-1.5">
      <label className={cn('flex w-fit items-center gap-2 text-[15px] leading-[15px] text-fg', otherAvailable && 'cursor-pointer')}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled || !otherAvailable}
          aria-describedby={hintId}
          onChange={(event) => checkout.setSlot(event.target.checked ? 'secondary' : 'primary')}
          className={cn(
            'grid size-[15px] shrink-0 appearance-none place-content-center rounded-full border-2 border-brand',
            'before:size-[7px] before:scale-0 before:rounded-full before:bg-brand before:transition-transform checked:before:scale-100',
            'disabled:opacity-60',
          )}
        />
        Usar outra carteira?
      </label>
      <p id={hintId} className="text-[13px] leading-5 text-fg-subtle">
        {other ? (
          <>
            {checked ? 'Em uso: carteira reserva' : 'Carteira reserva:'} {walletDescription(checked ? wallets.secondary! : other)}
          </>
        ) : (
          <>
            Você ainda não tem outra carteira cadastrada.{' '}
            <Link to="/account/wallets" preload={false} className="font-bold text-brand-text underline-offset-4 hover:underline">
              Cadastrar carteira
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
