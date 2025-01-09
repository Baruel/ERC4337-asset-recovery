import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_NETWORKS } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface CustomToken {
  address: string;
  symbol: string;
  network: string;
}

export default function CustomTokenForm() {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [network, setNetwork] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      if (!address.startsWith("0x") || address.length !== 42) {
        throw new Error("Invalid token address format");
      }
      if (!symbol) {
        throw new Error("Symbol is required");
      }
      if (!network) {
        throw new Error("Network is required");
      }

      // Store the custom token
      const customTokens: CustomToken[] = JSON.parse(localStorage.getItem("customTokens") || "[]");
      customTokens.push({ address, symbol, network });
      localStorage.setItem("customTokens", JSON.stringify(customTokens));

      toast({
        title: "Token Added",
        description: `${symbol} token has been added to your list.`,
      });

      // Reset form and close dialog
      setAddress("");
      setSymbol("");
      setNetwork("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add token",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Token</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="network">Network</Label>
            <Select onValueChange={setNetwork} value={network}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_NETWORKS.map((network) => (
                  <SelectItem key={network.id} value={network.name}>
                    {network.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Token Contract Address</Label>
            <Input
              id="address"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="symbol">Token Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., USDC"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit}>
            Add Token
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
