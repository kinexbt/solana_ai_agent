'use client';

import { ExternalLink, TrendingUp, Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { WalletPortfolio as Portfolio } from '@/types/helius/portfolio';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

interface WalletPortfolioProps {
  data: Portfolio;
  className?: string;
  isLoading?: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function TokenCardSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded-lg bg-muted" />
          <div className="h-4 w-24 rounded-lg bg-muted" />
        </div>
        <div className="space-y-2 text-right">
          <div className="h-5 w-28 rounded-lg bg-muted" />
          <div className="h-4 w-20 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

function TokenRow({
  token,
  index,
}: {
  token: Portfolio['tokens'][0];
  index: number;
}) {
  const hasPrice = token.pricePerToken > 0;

  return (
    <a
      href={`https://solscan.io/token/${token.mint}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group/row relative block transition-colors duration-200 ease-out hover:bg-muted/50"
    >
      <div className="relative flex items-center justify-between p-3 sm:p-4">
        {/* Token Info */}
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            <Avatar className="h-8 w-8 rounded-lg border bg-gradient-to-br from-background to-muted sm:h-12 sm:w-12 sm:rounded-xl">
              <AvatarImage
                src={token.imageUrl}
                alt={token.name}
                className="object-cover transition-transform duration-300 group-hover/row:scale-105"
              />
              <AvatarFallback className="rounded-xl text-sm">
                {getInitials(token.name)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-background bg-primary opacity-0 transition-opacity duration-200 group-hover/row:opacity-100" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium">{token.name}</div>
              <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:flex">
                {token.symbol}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2 text-xs sm:text-sm">
              <span className="font-medium text-muted-foreground">
                {(token.balance * 1e18).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                {token.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="font-medium">
            {formatNumber(
              token.balance * 1e18 * token.pricePerToken,
              'currency',
            )}
          </div>
          {hasPrice && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
              <span>@ {token.pricePerToken.toFixed(4)} $</span>
              <ExternalLink className="h-3.5 w-3.5 transition-colors group-hover/row:text-primary" />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export function WalletPortfolio({
  data,
  className,
  isLoading = false,
}: WalletPortfolioProps) {
  const decimal = 1e18;
  console.log('data-------------->:', data);
  if (isLoading) {
    return (
      <Card
        className={cn(
          'mt-3 overflow-hidden border-border/50 bg-gradient-to-br from-background to-muted/30',
          className,
        )}
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center justify-between">
            <div className="h-7 w-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-7 w-28 animate-pulse rounded-lg bg-muted" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[480px] pr-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <TokenCardSkeleton key={i} />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'mt-3 overflow-hidden border-border/50 bg-gradient-to-br from-background to-muted/30',
        className,
      )}
    >
      <CardHeader className="border-b border-border/40 bg-muted/20 p-4 sm:p-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span>Portfolio Value</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{data.tokens.length} tokens</span>
            </div>
          </div>
          <span className="text-base font-medium sm:text-lg">
            {formatNumber(data.totalBalance * decimal, 'currency')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[480px]">
          <div className="divide-y divide-border/40">
            {data.tokens.map((token, index) => (
              <TokenRow key={index} token={token} index={index} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
