import { create } from 'zustand';
import { createPublicClient, http } from 'viem';
import { SUPPORTED_NETWORKS } from './web3';

interface DeploymentState {
  status: 'idle' | 'deploying' | 'deployed' | 'failed';
  error: string | null;
  transactionHash: string | null;
  setStatus: (status: DeploymentState['status']) => void;
  setError: (error: string | null) => void;
  setTransactionHash: (hash: string | null) => void;
  reset: () => void;
}

export const useDeploymentStore = create<DeploymentState>((set) => ({
  status: 'idle',
  error: null,
  transactionHash: null,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setTransactionHash: (hash) => set({ transactionHash: hash }),
  reset: () => set({ status: 'idle', error: null, transactionHash: null })
}));

export async function verifyDeployment(address: string, chainId: number): Promise<boolean> {
  try {
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
    if (!network) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const client = createPublicClient({
      chain: network,
      transport: http()
    });

    // Check if the address has code (is a contract)
    const code = await client.getBytecode({ address: address as `0x${string}` });
    return code !== undefined && code !== '0x';
  } catch (error) {
    console.error('Error verifying deployment:', error);
    return false;
  }
}

export async function estimateDeploymentGas(
  factoryAddress: string,
  ownerAddress: string,
  chainId: number
): Promise<bigint> {
  try {
    const network = SUPPORTED_NETWORKS.find(n => n.id === chainId);
    if (!network) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const client = createPublicClient({
      chain: network,
      transport: http()
    });

    // Estimate gas for factory deployment transaction
    const gasEstimate = await client.estimateContractGas({
      address: factoryAddress as `0x${string}`,
      abi: [{
        name: 'createAccount',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'salt', type: 'uint256' }
        ],
        outputs: [{ type: 'address' }]
      }],
      functionName: 'createAccount',
      args: [ownerAddress as `0x${string}`, BigInt(0)],
    });

    // Add 20% buffer for safety
    return (gasEstimate * BigInt(120)) / BigInt(100);
  } catch (error) {
    console.error('Error estimating deployment gas:', error);
    // Return a conservative default if estimation fails
    return BigInt(500000);
  }
}

// Helper to track deployment attempts and implement retry logic
export async function trackDeployment(
  deploymentPromise: Promise<any>,
  maxRetries: number = 3,
  retryDelay: number = 5000
): Promise<any> {
  const { setStatus, setError, setTransactionHash } = useDeploymentStore.getState();
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      setStatus('deploying');
      setError(null);
      
      const result = await deploymentPromise;
      setTransactionHash(result.hash);
      setStatus('deployed');
      return result;
    } catch (error: any) {
      console.error(`Deployment attempt ${attempts + 1} failed:`, error);
      attempts++;
      
      if (attempts === maxRetries) {
        setStatus('failed');
        setError(error.message || 'Deployment failed after maximum retries');
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}
