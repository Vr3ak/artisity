// Centers every auth card between the 4rem top bar and, below md, the 4rem tab bar.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100svh-8rem)] md:min-h-[calc(100svh-4rem)] w-full items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
