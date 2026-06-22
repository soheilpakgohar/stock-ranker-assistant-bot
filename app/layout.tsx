import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artin Store Bot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
