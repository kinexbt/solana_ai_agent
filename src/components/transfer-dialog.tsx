'use client';

import { useState } from 'react';

import Image from 'next/image';

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { transferToken } from '@/server/actions/ai-solana';
import { FungibleToken } from '@/types/helius/fungibleToken';

interface TokenTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: FungibleToken[];
  otherAddresses: string[];
  walletId: string;
  onSuccess: () => Promise<void>;
}

interface TransactionResult {
  success: boolean;
  timestamp: Date;
  error?: string;
  hash?: string;
}

export function TokenTransferDialog({
  isOpen,
  onClose,
  walletId,
  tokens,
  otherAddresses,
  onSuccess,
}: TokenTransferDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionResult, setTransactionResult] =
    useState<TransactionResult | null>(null);

  const selectedTokenData = tokens.find(
    (token) => token.content.metadata.symbol === selectedToken,
  );

  const handleSubmit = async () => {
    if (!selectedTokenData) {
      toast.error('Please select a token');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await transferToken({
        walletId: walletId,
        receiverAddress: address,
        tokenAddress: selectedTokenData?.id,
        amount: parseFloat(amount),
        tokenSymbol: selectedToken,
      });

      if (!response?.data?.success || !response?.data?.data) {
        toast.error('Transaction failed. Please try again.');
        return;
      }

      const { signature } = response.data.data;

      setTransactionResult({
        success: true,
        timestamp: new Date(),
        hash: signature,
      });
      setStep(5);
      await onSuccess();
    } catch (error) {
      setTransactionResult({
        success: false,
        timestamp: new Date(),
        error: 'Transaction failed. Please try again.',
      });
      setStep(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setSelectedToken('');
    setAmount('');
    setAddress('');
    setTransactionResult(null);
  };

  const formatBalance = (balance: number, decimals: number) => {
    return (balance / Math.pow(10, decimals)).toFixed(4);
  };

  const calculateUsdValue = (
    balance: number,
    decimals: number,
    pricePerToken: number,
  ) => {
    return (balance / Math.pow(10, decimals)) * pricePerToken;
  };

  const handleQuickAmount = (percentage: number) => {
    if (selectedTokenData) {
      const { balance, decimals } = selectedTokenData.token_info;
      const maxAmount = balance / Math.pow(10, decimals);
      const newAmount = maxAmount * (percentage / 100);

      const factor = Math.pow(10, decimals);
      const truncated = Math.floor(newAmount * factor) / factor;

      setAmount(truncated.toString());
    }
  };

  const handleAmountChange = (newValue: string) => {
    if (selectedTokenData) {
      const { decimals } = selectedTokenData.token_info;
      const decimalRegex = new RegExp(`^(\\d+)(\\.(\\d{0,${decimals}}))?$`);
      if (newValue === '' || decimalRegex.test(newValue)) {
        setAmount(newValue);
      }
    } else {
      setAmount(newValue);
    }
  };

  const renderTokenInfo = (showSelectedAmount: boolean = false) => {
    if (!selectedTokenData) return null;

    const tokenBalance = showSelectedAmount
      ? parseFloat(amount)
      : selectedTokenData.token_info.balance /
        Math.pow(10, selectedTokenData.token_info.decimals);

    const usdValue =
      selectedTokenData.token_info.price_info.price_per_token * tokenBalance;

    return (
      <Card className="mb-4 p-4">
        <div className="flex items-center space-x-3">
          <Image
            src={selectedTokenData.content.files[0]?.uri || '/placeholder.svg'}
            alt={selectedTokenData.content.metadata.name}
            width={32}
            height={32}
            className="rounded-full"
          />
          <div className="flex-1">
            <p className="font-medium">
              {selectedTokenData.content.metadata.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {showSelectedAmount
                ? `Amount: ${amount} ${selectedTokenData.content.metadata.symbol}`
                : `Available: ${formatBalance(selectedTokenData.token_info.balance, selectedTokenData.token_info.decimals)} ${selectedTokenData.content.metadata.symbol}`}
            </p>
          </div>
          {selectedTokenData.token_info.price_info.price_per_token && (
            <div className="text-right">
              <p className="text-base font-medium">${usdValue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                $
                {selectedTokenData.token_info.price_info.price_per_token.toFixed(
                  2,
                )}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid gap-4 py-4">
            <Label>Select Token</Label>
            <RadioGroup value={selectedToken} onValueChange={setSelectedToken}>
              {tokens.map((token) => {
                const balance =
                  token.token_info.balance /
                  Math.pow(10, token.token_info.decimals);
                const usdValue = calculateUsdValue(
                  token.token_info.balance,
                  token.token_info.decimals,
                  token.token_info.price_info.price_per_token,
                );

                return (
                  <div
                    key={token.id}
                    className="flex items-center space-x-4 space-y-4 first:mt-0"
                  >
                    <RadioGroupItem
                      value={token.content.metadata.symbol}
                      id={token.content.metadata.symbol}
                      className="peer"
                    />
                    <Label
                      htmlFor={token.content.metadata.symbol}
                      className="flex flex-1 items-center space-x-3 rounded-md border p-4 peer-aria-checked:border-primary"
                    >
                      <Image
                        src={token.content.files[0]?.uri || '/placeholder.svg'}
                        alt={token.content.metadata.name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {token.content.metadata.name}
                        </p>
                        <p className="mb-1 font-mono text-xs text-muted-foreground">
                          {token.id.slice(0, 4)}...{token.id.slice(-4)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Available: {balance.toFixed(4)}{' '}
                          {token.content.metadata.symbol}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-medium">
                          ${usdValue.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          $
                          {token.token_info.price_info.price_per_token.toFixed(
                            2,
                          )}
                        </p>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 2:
        return (
          <div className="grid gap-4 py-4">
            {renderTokenInfo()}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
              {selectedTokenData && amount && (
                <p className="text-sm text-muted-foreground">
                  ≈ $
                  {(
                    parseFloat(amount) *
                    selectedTokenData.token_info.price_info.price_per_token
                  ).toFixed(2)}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(25)}
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(50)}
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(75)}
                >
                  75%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(100)}
                >
                  Max
                </Button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="grid gap-4 py-4">
            {renderTokenInfo(true)}
            <div className="space-y-2">
              <Label>Recipient Address</Label>
              <Select value={address} onValueChange={setAddress}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recipient address">
                    {address && `${address.slice(0, 4)}...${address.slice(-4)}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {otherAddresses.map((addr) => (
                    <SelectItem key={addr} value={addr} className="w-full">
                      <span className="w-full font-mono">
                        {addr.slice(0, 4)}...{addr.slice(-4)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">
                  Or enter manually:
                </Label>
                <Input
                  placeholder="Enter recipient address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="grid gap-4 py-4">
            <h3 className="font-semibold">Confirm Transaction</h3>
            <Card className="space-y-3 p-4">
              {renderTokenInfo(true)}
              <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                <div className="text-muted-foreground">Amount:</div>
                <div className="font-medium">
                  {amount} {selectedToken}
                  {selectedTokenData?.token_info.price_info.price_per_token && (
                    <span className="block text-sm text-muted-foreground">
                      ≈ $
                      {(
                        parseFloat(amount) *
                        selectedTokenData.token_info.price_info.price_per_token
                      ).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground">Recipient:</div>
                <div className="break-all font-mono font-medium">{address}</div>
              </div>
            </Card>
          </div>
        );

      case 5:
        if (!transactionResult) return null;

        return (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center justify-center text-center">
              {transactionResult.success ? (
                <>
                  <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
                  <h3 className="mb-2 text-xl font-semibold">
                    Transaction Successful
                  </h3>
                </>
              ) : (
                <>
                  <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
                  <h3 className="mb-2 text-xl font-semibold">
                    Transaction Failed
                  </h3>
                  {transactionResult.error && (
                    <p className="mb-4 text-sm text-red-500">
                      {transactionResult.error}
                    </p>
                  )}
                </>
              )}
            </div>

            <Card className="p-4">
              <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                <div className="text-muted-foreground">Status:</div>
                <div
                  className={`font-medium ${transactionResult.success ? 'text-green-500' : 'text-red-500'}`}
                >
                  {transactionResult.success ? 'Completed' : 'Failed'}
                </div>

                <div className="text-muted-foreground">Token:</div>
                <div className="font-medium">
                  {selectedTokenData?.content.metadata.name} ({selectedToken})
                </div>

                <div className="text-muted-foreground">Amount:</div>
                <div className="font-medium">
                  {amount} {selectedToken}
                  {selectedTokenData?.token_info.price_info.price_per_token && (
                    <span className="block text-sm text-muted-foreground">
                      ≈ $
                      {(
                        parseFloat(amount) *
                        selectedTokenData.token_info.price_info.price_per_token
                      ).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="text-muted-foreground">Recipient:</div>
                <div className="break-all font-mono font-medium">{address}</div>

                <div className="text-muted-foreground">Time:</div>
                <div className="font-medium">
                  {transactionResult.timestamp.toLocaleTimeString()}
                </div>
                <div className="text-muted-foreground">Transaction:</div>
                <div className="space-y-1 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {`${transactionResult.hash?.slice(0, 6)}...${transactionResult.hash?.slice(-6)}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => {
                        if (transactionResult.hash) {
                          navigator.clipboard.writeText(transactionResult.hash);
                        }
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <a
                    href={`https://solscan.io/tx/${transactionResult.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View on Solscan
                  </a>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 5 ? 'Transaction Details' : 'Send Tokens'}
          </DialogTitle>
        </DialogHeader>

        {renderStepContent()}

        <div className="flex justify-between">
          {step === 5 ? (
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  className="ml-auto"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={
                    (step === 1 && !selectedToken) ||
                    (step === 2 && !amount) ||
                    (step === 3 && !address)
                  }
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className="ml-auto"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Confirm Send'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
