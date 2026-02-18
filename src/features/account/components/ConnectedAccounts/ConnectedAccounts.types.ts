// Type definitions for ConnectedAccounts component

export interface ConnectedAccountsProps {
  providers: Array<{ provider: string; providerAccountId: string }>;
  hasPassword: boolean;
}
