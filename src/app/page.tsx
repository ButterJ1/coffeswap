'use client';

import dynamic from 'next/dynamic';

// Use the correct path to your components folder
const CoffeeSwapApp = dynamic(
  () => import('../app/components/CoffeeSwapApp'),
  { ssr: false }
);

export default function Home() {
  return (
    <CoffeeSwapApp />
  );
}