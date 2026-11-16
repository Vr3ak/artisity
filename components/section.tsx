// A titled card: the profile editor's sections and every Settings card. No client code, so server
// pages render it directly.
export function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-6 rounded-3xl bg-nav p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
