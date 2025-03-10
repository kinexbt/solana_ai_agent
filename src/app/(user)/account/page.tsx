/**
 * Account page component
 * @file User account page with profile information and social account connections
 */
import { Metadata } from 'next';

import { ChooseAccount } from './ChooseAccount';
import { AccountContent } from './account-content';

/**
 * Account page component
 * @file User account page with profile information and social account connections
 */

export const metadata: Metadata = {
  title: 'Account',
  description: 'A place to manage your account and settings',
};

export default function AccountPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="border-b border-sidebar-accent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex-2 flex h-14 w-full items-center justify-start px-8">
          <h1 className="text-lg font-medium">Your Accounts</h1>
          <ChooseAccount />
        </div>
      </div>

      {/* Page content */}
      <AccountContent />
    </div>
  );
}
