import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Research Assistant',
  description: 'AI powered research assistant on AWS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
