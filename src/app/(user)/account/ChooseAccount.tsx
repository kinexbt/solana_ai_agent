'use client';

import { useRouter } from 'next/navigation';

import { PencilIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';

export function ChooseAccount() {
  const router = useRouter();

  const handleSelectAccount = (chain: 'solana' | 'bsc') => {
    const route = chain === 'solana' ? '/account/solana' : '/account/bsc';
    router.push(route);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction>
          <MoreHorizontal className="h-4 w-4" />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem onClick={() => handleSelectAccount('solana')}>
          <PencilIcon className="h-4 w-4" />
          <span>Choose Solana Account</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSelectAccount('bsc')}>
          <PencilIcon className="h-4 w-4" />
          <span>Choose BSC Account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
