import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'wagmi/chains';
import { create } from 'zustand';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, encodeAbiParameters, parseAbiParameters, encodeFunctionData } from 'viem';

interface WalletState {
  address: string | null;
  smartWalletAddress: string | null;
  privateKey: string | null;
  connect: (privateKey: string, smartWalletAddress: string) => Promise<void>;
  disconnect: () => void;
}

// ERC-4337 EntryPoint ABI for handling UserOperation
const ENTRY_POINT_ABI = [{
  name: 'handleOps',
  type: 'function',
  stateMutability: 'payable',
  inputs: [{
    name: 'ops',
    type: 'tuple[]',
    components: [
      { name: 'sender', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'initCode', type: 'bytes' },
      { name: 'callData', type: 'bytes' },
      { name: 'callGasLimit', type: 'uint256' },
      { name: 'verificationGasLimit', type: 'uint256' },
      { name: 'preVerificationGas', type: 'uint256' },
      { name: 'maxFeePerGas', type: 'uint256' },
      { name: 'maxPriorityFeePerGas', type: 'uint256' },
      { name: 'paymasterAndData', type: 'bytes' },
      { name: 'signature', type: 'bytes' }
    ]
  }],
  outputs: [{ type: 'uint256[]' }]
}] as const;

// ERC-20 transfer ABI
const ERC20_TRANSFER_ABI = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ type: 'bool' }]
}] as const;

// Define supported networks
export const SUPPORTED_NETWORKS = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc
];

// Create wallet store
const useWalletStore = create<WalletState>((set) => ({
  address: null,
  smartWalletAddress: null,
  privateKey: null,
  connect: async (privateKey: string, smartWalletAddress: string) => {
    try {
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      // Create wallet clients for each network
      const walletClients = SUPPORTED_NETWORKS.map(network =>
        createWalletClient({
          account,
          chain: network,
          transport: http()
        })
      );

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

// Initialize wagmi config with all supported networks
export const config = createConfig({
  chains: SUPPORTED_NETWORKS,
  transports: Object.fromEntries(
    SUPPORTED_NETWORKS.map(network => [
      network.id,
      http()
    ])
  )
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
  const { privateKey, smartWalletAddress } = useWalletStore();

  return {
    mutateAsync: async (values: {
      recipient: string;
      amount: string;
      network: string;
      token: string;
    }) => {
      try {
        if (!privateKey || !smartWalletAddress) {
          throw new Error('Wallet not connected');
        }

        // Find the selected network
        const network = SUPPORTED_NETWORKS.find(n => n.name === values.network);
        if (!network) {
          throw new Error('Network not supported');
        }

        // Create transfer calldata
        const callData = encodeFunctionData({
          abi: ERC20_TRANSFER_ABI,
          functionName: 'transfer',
          args: [values.recipient as `0x${string}`, BigInt(values.amount)]
        });

        // Create UserOperation
        const userOp = {
          sender: smartWalletAddress as `0x${string}`,
          nonce: BigInt(0), // Should be fetched from the smart wallet contract
          initCode: '0x',
          callData,
          callGasLimit: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          preVerificationGas: BigInt(21000),
          maxFeePerGas: BigInt(1000000000),
          maxPriorityFeePerGas: BigInt(1000000000),
          paymasterAndData: '0x',
          signature: '0x' // Will be filled after signing
        };

        console.log('Sending UserOperation:', {
          network: network.name,
          chainId: network.id,
          recipient: values.recipient,
          amount: values.amount,
          token: values.token,
          userOp
        });

        // Send to bundler
        const response = await fetch('/api/send-user-operation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userOp,
            network: network.id
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Transaction failed:', error);
          throw new Error(error.details || 'Failed to send transaction');
        }

        const result = await response.json();
        console.log('Transaction result:', result);
        return result;
      } catch (error) {
        console.error('Transaction error:', error);
        throw error;
      }
    },
    isLoading: false
  };
}