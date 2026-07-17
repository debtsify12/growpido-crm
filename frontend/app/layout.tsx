import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Growpido CRM',
  description: 'In-house CRM for Growpido — end-to-end lead lifecycle management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
