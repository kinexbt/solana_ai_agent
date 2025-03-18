'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function ChooseAccount() {
  const router = useRouter();

  const handleSelectAccount = (chain: 'solana' | 'bsc') => {
    const route = chain === 'solana' ? '/account/solana' : '/account/bsc';
    router.push(route);
  };

  return (
    <div className="ml-8 flex items-center gap-2">
      <Button
        variant="outline"
        className="h-8 rounded-lg px-4 text-sm transition-colors hover:bg-primary hover:text-primary-foreground"
        onClick={() => handleSelectAccount('solana')}
      >
        SOLANA
      </Button>
      <Button
        variant="outline"
        className="h-8 rounded-lg px-4 text-sm transition-colors hover:bg-primary hover:text-primary-foreground"
        onClick={() => handleSelectAccount('bsc')}
      >
        BSC
      </Button>
    </div>
  );
}
