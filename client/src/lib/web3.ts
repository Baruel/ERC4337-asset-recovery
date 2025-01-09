import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'wagmi/chains';
import { create } from 'zustand';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, encodeAbiParameters, parseAbiParameters, encodeFunctionData, keccak256, toBytes } from 'viem';

interface WalletState {
  address: string | null;
  smartWalletAddress: string | null;
  privateKey: string | null;
  connect: (privateKey: string, smartWalletAddress: string) => Promise<void>;
  disconnect: () => void;
}

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

  const signUserOp = async (userOp: any, entryPoint: string) => {
    if (!privateKey) throw new Error('No private key available');

    // Hash the user operation
    const encodedUserOp = encodeAbiParameters(
      parseAbiParameters('address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData'),
      [{
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: userOp.paymasterAndData
      }]
    );

    const userOpHash = keccak256(encodedUserOp);
    console.log('User operation hash:', userOpHash);

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const client = createWalletClient({
      account,
      chain: mainnet,
      transport: http()
    });

    const signature = await client.signMessage({ message: { raw: toBytes(userOpHash) } });
    console.log('Generated signature:', signature);

    return signature;
  };

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
          abi: [{
            name: 'transfer',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'recipient', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ type: 'bool' }]
          }],
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
          paymasterAndData: '0x'
        };

        console.log('Created user operation:', userOp);

        // Sign the user operation
        const entryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
        const signature = await signUserOp(userOp, entryPoint);
        userOp.signature = signature;

        console.log('Sending signed UserOperation:', {
          network: network.name,
          chainId: network.id,
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

        const responseText = await response.text();
        console.log('Raw bundler response:', responseText);

        if (!response.ok) {
          let errorDetails;
          try {
            errorDetails = JSON.parse(responseText).details;
          } catch (e) {
            errorDetails = responseText;
          }
          throw new Error(errorDetails || 'Failed to send transaction');
        }

        const result = JSON.parse(responseText);
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