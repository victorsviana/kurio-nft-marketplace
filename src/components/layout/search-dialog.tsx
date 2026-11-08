import { useNavigate } from '@tanstack/react-router'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Header search (desktop icon). Submitting writes the term to the catalog URL (`/?q=`), so
 * the search is shareable and survives refresh (CAT-02).
 */
export function SearchDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const navigate = useNavigate()
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = term.trim()
    setOpen(false)
    void navigate({ to: '/', search: q ? { q } : {}, hash: 'catalogo' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-line-soft bg-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription className="text-fg-muted">Procure por nome, coleção ou criador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3" role="search">
          <Label htmlFor={inputId} className="sr-only">
            Termo de busca
          </Label>
          <Input
            id={inputId}
            type="search"
            autoFocus
            value={term}
            maxLength={80}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Explorar coleções"
            className="h-11 border-line-soft bg-ink text-base"
          />
          <Button type="submit" className="self-end">
            Buscar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
