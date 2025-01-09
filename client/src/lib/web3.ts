import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, avalanche, bsc } from 'wagmi/chains';
import { create } from 'zustand';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, encodeFunctionData, keccak256, concat, toBytes } from 'viem';

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

// Convert BigInt values to hex strings for serialization
function serializeUserOp(userOp: any) {
  const formatHex = (value: bigint | string) => {
    const hex = typeof value === 'bigint' ? value.toString(16) : value;
    return hex.startsWith('0x') ? hex : `0x${hex}`;
  };

  return {
    sender: formatHex(userOp.sender),
    nonce: formatHex(userOp.nonce),
    initCode: formatHex(userOp.initCode),
    callData: formatHex(userOp.callData),
    callGasLimit: formatHex(userOp.callGasLimit),
    verificationGasLimit: formatHex(userOp.verificationGasLimit),
    preVerificationGas: formatHex(userOp.preVerificationGas),
    maxFeePerGas: formatHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: formatHex(userOp.maxPriorityFeePerGas),
    paymasterAndData: formatHex(userOp.paymasterAndData),
    signature: formatHex(userOp.signature || '0x')
  };
}

// Hook for sending transactions
export function useSendTransaction() {
  const { privateKey, smartWalletAddress } = useWalletStore();

  const signUserOp = async (userOp: any) => {
    if (!privateKey) throw new Error('No private key available');

    const formatHex = (value: bigint | string) => {
      const hex = typeof value === 'bigint' ? value.toString(16) : value;
      return hex.startsWith('0x') ? hex : `0x${hex}`;
    };

    // Pack the parameters in the correct order for EIP-4337
    const packed = concat([
      toBytes(formatHex(userOp.sender)),
      toBytes(formatHex(userOp.nonce)),
      toBytes(formatHex(userOp.initCode)),
      toBytes(formatHex(userOp.callData)),
      toBytes(formatHex(userOp.callGasLimit)),
      toBytes(formatHex(userOp.verificationGasLimit)),
      toBytes(formatHex(userOp.preVerificationGas)),
      toBytes(formatHex(userOp.maxFeePerGas)),
      toBytes(formatHex(userOp.maxPriorityFeePerGas)),
      toBytes(formatHex(userOp.paymasterAndData))
    ]);

    // Hash the packed parameters
    const userOpHash = keccak256(packed);
    console.log('Generated user operation hash:', userOpHash);

    // Sign the hash
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

        // Create UserOperation with properly formatted values
        const userOp = {
          sender: smartWalletAddress,
          nonce: BigInt(0),
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
        const signature = await signUserOp(userOp);
        const signedUserOp = { ...userOp, signature };

        // Serialize BigInt values before sending to API
        const serializedUserOp = serializeUserOp(signedUserOp);

        console.log('Sending serialized UserOperation:', JSON.stringify(serializedUserOp, null, 2));

        // Send to bundler
        const response = await fetch('/api/send-user-operation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userOp: serializedUserOp,
            network: network.id
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Raw bundler response:', errorText);
          let errorDetails;
          try {
            errorDetails = JSON.parse(errorText).error?.message || errorText;
          } catch (e) {
            errorDetails = errorText;
          }
          throw new Error(errorDetails);
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