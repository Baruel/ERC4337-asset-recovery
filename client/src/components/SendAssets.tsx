import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTokenBalances } from "@/lib/tokens";
import { useSendTransaction } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_NETWORKS } from "@/lib/web3";
import { TransactionErrorDisplay } from "@/components/ui/transaction-error-display";

interface CustomToken {
  address: string;
  symbol: string;
  network: string;
}

const formSchema = z.object({
  recipient: z.string().startsWith("0x").length(42, "Invalid address length"),
  amount: z.string().min(1, "Amount is required"),
  network: z.string().min(1, "Network is required"),
  token: z.string().startsWith("0x", "Invalid token address"),
});

interface SendAssetsProps {
  address: string;
}

interface TransactionError {
  userOperation?: Record<string, any>;
  network?: {
    name: string;
    chainId: number;
  };
  endpoint?: string;
  message: string;
  rawError?: string;
}

export default function SendAssets({ address }: SendAssetsProps) {
  const { data: networkTokens } = useTokenBalances(address);
  const { toast } = useToast();
  const { mutateAsync: sendTransaction, isLoading } = useSendTransaction();
  const [error, setError] = useState<TransactionError | null>(null);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);

  // Load custom tokens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("customTokens");
    if (stored) {
      setCustomTokens(JSON.parse(stored));
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      amount: "",
      network: "",
      token: "",
    },
  });

  // Combine and filter tokens based on selected network
  const selectedNetwork = form.watch("network");
  const availableTokens = [
    ...(networkTokens?.filter(token => token.network === selectedNetwork) || []),
    ...customTokens
      .filter(token => token.network === selectedNetwork)
      .map(token => ({
        ...token,
        balance: '0',
        value: 0
      }))
  ];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setError(null);
      const network = SUPPORTED_NETWORKS.find(n => n.name === values.network);
      if (!network) {
        throw new Error('Network not found');
      }

      await sendTransaction(values);
      toast({
        title: "Transaction Sent",
        description: "Your transaction has been submitted to the network.",
      });
      form.reset();
    } catch (error: any) {
      const network = SUPPORTED_NETWORKS.find(n => n.name === values.network);

      const errorDetails: TransactionError = {
        message: error.message || 'Failed to send transaction',
        network: network ? {
          name: network.name,
          chainId: network.id
        } : undefined,
        endpoint: '/api/send-user-operation',
        userOperation: error.userOperation,
        rawError: error.rawError
      };

      setError(errorDetails);
      console.error('Transaction Error:', errorDetails);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient Address</FormLabel>
                <FormControl>
                  <Input placeholder="0x..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="network"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Network</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPORTED_NETWORKS.map((network) => (
                      <SelectItem key={network.id} value={network.name}>
                        {network.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!form.watch("network")}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem 
                        key={`${token.network}-${token.address}`} 
                        value={token.address}
                      >
                        {token.symbol} {token.balance !== '0' ? `(${token.balance})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </form>
      </Form>

      <TransactionErrorDisplay
        open={!!error}
        onClose={() => setError(null)}
        error={error || { message: '' }}
      />
    </>
  );
}