import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Portfolio Dashboard',
  description: 'Live Portfolio Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
