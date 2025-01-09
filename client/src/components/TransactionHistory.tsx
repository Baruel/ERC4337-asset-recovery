import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTransactionHistory } from "@/lib/web3";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

interface TransactionHistoryProps {
  address: string;
}

export default function TransactionHistory({ address }: TransactionHistoryProps) {
  const { data: transactions, isLoading } = useTransactionHistory(address);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Explorer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions?.map((tx) => (
          <TableRow key={tx.hash}>
            <TableCell>{tx.type}</TableCell>
            <TableCell>{tx.amount}</TableCell>
            <TableCell>{new Date(tx.timestamp).toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <a
                href={`https://etherscan.io/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
