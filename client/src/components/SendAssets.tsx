import { useState } from "react";
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
import { ErrorOverlay } from "@/components/ui/error-overlay";

const formSchema = z.object({
  recipient: z.string().startsWith("0x"),
  amount: z.string().min(1),
  network: z.string(),
  token: z.string(),
});

interface SendAssetsProps {
  address: string;
}

export default function SendAssets({ address }: SendAssetsProps) {
  const { data: tokens } = useTokenBalances(address);
  const { toast } = useToast();
  const { mutateAsync: sendTransaction, isLoading } = useSendTransaction();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      amount: "",
      network: "",
      token: "",
    },
  });

  // Filter tokens based on selected network
  const networkTokens = tokens?.filter(
    (token) => token.network === form.watch("network")
  );

  function formatErrorMessage(error: any): string {
    if (typeof error === 'string') return error;

    // Handle specific error types
    if (error.message?.includes('insufficient funds')) {
      return 'Insufficient funds to complete this transaction. Please check your balance and try again.';
    }
    if (error.message?.includes('nonce')) {
      return 'Transaction sequence error. Please wait a moment and try again.';
    }
    if (error.message?.includes('gas')) {
      return 'Gas estimation failed. The transaction might be invalid or the network could be congested.';
    }

    // Default error message
    return error.message || 'Failed to send transaction. Please try again.';
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setError(null);
      await sendTransaction(values);
      toast({
        title: "Transaction Sent",
        description: "Your transaction has been submitted to the network.",
      });
      form.reset();
    } catch (error) {
      const formattedError = formatErrorMessage(error);
      setError(formattedError);
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
                    {networkTokens?.map((token) => (
                      <SelectItem key={token.address} value={token.address}>
                        {token.symbol}
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
                  <Input type="number" step="any" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </form>
      </Form>

      <ErrorOverlay
        open={!!error}
        onClose={() => setError(null)}
        description={error || ''}
      />
    </>
  );
}