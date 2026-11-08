/**
 * Measurements of the two Figma presentations (design/auth/spec.md):
 * - desktop: Sign In / Sign Up modals, 340-wide column, inputs 40 r5, CTA 45 r5;
 * - mobile: Mobile / Login and Mobile / Cadastro frames, full width, inputs 50 r10, CTA 60 r10.
 */
export type AuthVariant = 'desktop' | 'mobile'

export const variantStyles = {
  desktop: {
    input: 'h-10 rounded-[5px]',
    cta: 'h-[45px] rounded-[5px]',
    /** Form column inside the 500-wide modal (px 80 → 340). */
    column: 'px-20',
  },
  mobile: {
    input: 'h-[50px] rounded-[10px]',
    cta: 'h-[60px] rounded-[10px]',
    column: '',
  },
} as const satisfies Record<AuthVariant, Record<string, string>>
