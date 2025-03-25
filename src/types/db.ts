import type {
  Action,
  Message,
  Subscription,
  SubscriptionPayment,
  Wallet as _PrismaWallet,
} from '@prisma/client';
import { Prisma, User as _PrismaUser } from '@prisma/client';
import type { Conversation as _PrismaConversation } from '@prisma/client';
import { User as _PrivyUser } from '@privy-io/react-auth';

export type EmbeddedWallet = Pick<
  _PrismaWallet,
  | 'name'
  | 'id'
  | 'userId'
  | 'publicKey'
  | 'encryptedPrivateKey'
  | 'walletSource'
  | 'chain'
  | 'createdAt'
  | 'updatedAt'
>;

export type ConversationMeta = Pick<
  _PrismaConversation,
  'id' | 'userId' | 'title'
>;

export type Conversation = _PrismaConversation & {
  messages: Message[];
};

export type PrivyUser = _PrivyUser;

export type PrismaUser = _PrismaUser & {
  wallets: EmbeddedWallet[];
  subscription:
    | (Subscription & {
        payments: SubscriptionPayment[];
      })
    | null;
};

export type NeurUser = Pick<
  PrismaUser,
  | 'id'
  | 'privyId'
  | 'createdAt'
  | 'updatedAt'
  | 'earlyAccess'
  | 'wallets'
  | 'degenMode'
  | 'subscription'
  | 'referralCode'
  | 'referringUserId'
> & {
  privyUser: PrivyUser;
  hasEAP: boolean;
  telegramId?: string;
};

export type NewAction = Omit<Action, 'id'>;

export type ActionWithUser = Prisma.ActionGetPayload<{
  include: {
    user: {
      include: {
        wallets: true;
      };
    };
  };
}>;

export type ActionFull = Prisma.ActionGetPayload<{
  select: { [K in keyof Required<Prisma.ActionSelect>]: true };
}>;
