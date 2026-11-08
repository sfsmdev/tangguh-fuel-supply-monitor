import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tangguh Fuel Supply Monitoring - Marine & Industrial Fuel Supply',
  description:
    'Enterprise Marine & Industrial Fuel Supply Monitoring Platform (SPOB TRANS BILGIT & SHORE TANK COMBO)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className="bg-slate-100 text-slate-800 font-sans antialiased min-h-screen flex flex-col selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
