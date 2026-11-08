/** Temporary page body used while a screen is not implemented yet (Gate 1 only). */
export function PagePlaceholder({ title, requirement }: { title: string; requirement: string }) {
  return (
    <section className="container-page py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-fg-muted">Em construção — {requirement}</p>
    </section>
  )
}
