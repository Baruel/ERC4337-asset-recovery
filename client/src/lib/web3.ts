import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { create } from 'zustand';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient } from 'viem';

interface WalletState {
  address: string | null;
  smartWalletAddress: string | null;
  privateKey: string | null;
  connect: (privateKey: string, smartWalletAddress: string) => Promise<void>;
  disconnect: () => void;
}

// Create wallet store
const useWalletStore = create<WalletState>((set) => ({
  address: null,
  smartWalletAddress: null,
  privateKey: null,
  connect: async (privateKey: string, smartWalletAddress: string) => {
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: mainnet,
        transport: http()
      });

      set({
        address: account.address,
        smartWalletAddress,
        privateKey
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  },
  disconnect: () => {
    set({
      address: null,
      smartWalletAddress: null,
      privateKey: null
    });
  }
}));

// Initialize wagmi config
export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
});

// Hook for account management
export function useAccount() {
  const { address, smartWalletAddress, connect } = useWalletStore();
  return {
    address,
    smartWalletAddress,
    isConnected: !!address,
    connect
  };
}

// Hook for disconnecting
export function useDisconnect() {
  const { disconnect } = useWalletStore();
  return { disconnect };
}

// Hook for transaction history
export function useTransactionHistory(address: string) {
  return {
    data: [],
    isLoading: false
  };
}

// Hook for sending transactions
export function useSendTransaction() {
  return {
    mutateAsync: async (values: any) => {
      // Implementation will be added later
      console.log('Sending transaction:', values);
    },
    isLoading: false
  };
}