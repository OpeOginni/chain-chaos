export interface BetOption {
  id: number;
  description: string;
}

export interface Bet {
  id: number;
  description: string;
  category: string;
  bettingTokenSymbol: string;
  endTime: number;
}

export interface BetInfo {
  id: bigint;
  category: string;
  description: string;
  currencyType: number;
  betAmount: bigint;
  actualValue: bigint;
  status: number;
  totalPot: bigint;
  refundMode: boolean;
  playerBetCount: bigint;
  createdAt: bigint;
  startTime: bigint;
  endTime: bigint;
  settled?: boolean;
}

export enum BetStatus {
  ACTIVE = 0,
  SETTLED = 1,
  CANCELLED = 2
}

export enum CurrencyType {
  XTZ = 0,
  USDC = 1
} 