// Shared bits of the auth cards.

export const MIN_PASSWORD = 8;

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

// --destructive is 5.2:1 on the background; role=alert announces it.
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
