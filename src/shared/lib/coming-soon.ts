import { toast } from 'sonner'

/**
 * Out-of-scope actions (editorial pages, support, social, newsletter, social login) must not
 * look successful (GEN-03). They show a neutral "em breve" notice instead.
 */
export function comingSoon(feature: string) {
  toast.info(`${feature}: em breve`, {
    description: 'Este recurso não faz parte da demonstração.',
  })
}
