'use client';

import Head from 'next/head';
import { Inter } from 'next/font/google';
import './globals.css';
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ['latin'] });

const MiniKitProvider = dynamic(
  () => import('../app/components/MiniKitProvider'),
  { ssr: false }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Head>
        <title>CoffeeSwap - Trade Coffee with Peers</title>
        <meta 
          name="description" 
          content="A secure peer-to-peer coffee trading platform powered by World ID and World Chain" 
        />
      </Head>
      <body className={inter.className}>
        <MiniKitProvider>
          {children}
        </MiniKitProvider>
      </body>
    </html>
  );
}