import { useEffect } from "react";
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

interface TokenListProps {
  address: string;
}

export default function TokenList({ address }: TokenListProps) {
  const { data: tokens, isLoading, refetch } = useTokenBalances(address);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000);

    return () => clearInterval(interval);
  }, [refetch]);

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

  // Group tokens by network
  const tokensByNetwork = tokens?.reduce((acc, token) => {
    if (!acc[token.network]) {
      acc[token.network] = [];
    }
    acc[token.network].push(token);
    return acc;
  }, {} as Record<string, typeof tokens>);

  return (
    <div className="space-y-6">
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