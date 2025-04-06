// types.ts
export interface CoffeeType {
  id: number;
  name: string;
}

export interface StoreType {
  id: number;
  name: string;
}

export interface Coffee {
  coffeeType: number;
  storeType: number;
}

export interface SwapPost {
  id: number;
  user: string;
  offering: Coffee;
  accepting: Coffee[];
  quantity: number;
  timestamp?: number;
  active?: boolean;
}

export interface CoffeeTransaction {
  id: number;
  initiator: string;
  acceptor: string;
  initiatorCoffee: Coffee;
  acceptorCoffee: Coffee;
  initiatorPhoneLastDigits?: number;
  acceptorPhoneLastDigits?: number;
  status: number;
  timestamp: number;
  firstTransferrer?: string;
}

// Extend Window interface to include MiniKit for TypeScript
declare global {
  interface Window {
    MiniKit?: {
      isInstalled: () => boolean;
      walletAddress: string;
      user?: {
        username?: string;
      };
      commandsAsync: {
        walletAuth: (params: any) => Promise<any>;
        pay: (params: any) => Promise<any>;
        verify: (params: any) => Promise<any>;
      };
    };
  }
}