import { 
  createConfig,
  http,
} from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { walletConnect } from 'wagmi/connectors';

// Project ID from WalletConnect
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = createConfig({
  chains: [mainnet],
  connectors: [
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http()
  }
});

export function useWeb3Modal() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();

  return {
    address,
    isConnected,
    disconnect,
    connect
  };
}

export function useAccount() {
  return useAccount();
}

export function useTransactionHistory(address: string) {
  return useQuery({
    queryKey: ['/api/transactions', address],
    enabled: !!address
  });
}

export function useSendTransaction() {
  return {
    mutateAsync: async (values: any) => {
      // Implementation will be added later
      console.log('Sending transaction:', values);
    },
    isLoading: false
  };
}