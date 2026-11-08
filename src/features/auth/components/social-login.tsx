import { useId } from 'react'
import { cn } from '@/lib/utils'
import iconFacebook from '../assets/icon-facebook.svg'
import iconGoogle from '../assets/icon-google.svg'
import { variantStyles, type AuthVariant } from './variant'

const PROVIDERS = [
  { name: 'Google', icon: iconGoogle },
  { name: 'Facebook', icon: iconFacebook },
] as const

/**
 * "Ou continue com" + Google/Facebook (Figma "Social Block"). Social login is out of scope:
 * the buttons show an "em breve" notice and never fake a sign-in (GEN-03).
 */
export function SocialLogin({
  variant,
  onComingSoon,
  roomy = false,
  className,
}: {
  variant: AuthVariant
  onComingSoon: (feature: string) => void
  /** Desktop sign-up modal spaces the block 16 instead of 12. */
  roomy?: boolean
  className?: string
}) {
  const labelId = useId()
  // Figma gaps (divider → first button / between buttons): login modal 12/12, sign-up modal
  // 16/16, mobile 12/16.
  const spacing = variant === 'mobile' ? 'mt-3 gap-4' : roomy ? 'mt-4 gap-4' : 'mt-3 gap-3'
  return (
    <div role="group" aria-labelledby={labelId} className={cn('flex flex-col', className)}>
      {/* Desktop: the divider spans the whole modal; mobile: the form column. */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span id={labelId} className="text-[13px] leading-4 text-fg">
          Ou continue com
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <div className={cn('flex flex-col', spacing, variantStyles[variant].column)}>
        {PROVIDERS.map((provider) => (
          <button
            key={provider.name}
            type="button"
            onClick={() => onComingSoon(`Entrar com ${provider.name}`)}
            className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-line text-[13px] leading-4 font-medium text-fg-muted transition-colors hover:border-line-soft hover:bg-surface-dark/60 hover:text-fg"
          >
            <img src={provider.icon} alt="" width={20} height={20} className="size-5" />
            Continuar com {provider.name}
          </button>
        ))}
      </div>
    </div>
  )
}
