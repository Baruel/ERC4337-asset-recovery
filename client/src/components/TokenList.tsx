import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTokenBalances } from "@/lib/tokens";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CustomTokenForm from "./CustomTokenForm";
import { useAccount } from "@/lib/web3";

interface TokenListProps {
  address: string; // This is now the EOA address
}

interface CustomToken {
  address: string;
  symbol: string;
  network: string;
}

export default function TokenList({ address }: TokenListProps) {
  const { data: tokens, isLoading, refetch } = useTokenBalances(address);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);

  // Load custom tokens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("customTokens");
    if (stored) {
      setCustomTokens(JSON.parse(stored));
    }
  }, []);

  // Setup periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (!address) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-center text-muted-foreground">
            Please connect your smart wallet to view balances
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Combine default and custom tokens
  const allTokens = [
    ...(tokens || []),
    ...customTokens.map(token => ({
      ...token,
      balance: '0',
      value: 0
    }))
  ];

  // Group tokens by network
  const tokensByNetwork = allTokens.reduce((acc, token) => {
    if (!acc[token.network]) {
      acc[token.network] = [];
    }
    acc[token.network].push(token);
    return acc;
  }, {} as Record<string, typeof allTokens>);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CustomTokenForm />
      </div>
      {Object.entries(tokensByNetwork || {}).map(([network, networkTokens]) => (
        <Card key={network}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{network}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {networkTokens?.map((token) => (
                  <TableRow key={`${token.network}-${token.address}`}>
                    <TableCell className="font-medium">{token.symbol}</TableCell>
                    <TableCell>{token.balance}</TableCell>
                    <TableCell className="text-right">
                      ${token.value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}