'use client';

// Login layout - NO AuthProvider here since root layout already has one
// This prevents duplicate AuthProvider instances

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
