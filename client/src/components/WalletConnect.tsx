import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount, useDisconnect } from "@/lib/web3";

export default function WalletConnect() {
  const { address, connect } = useAccount();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [privateKey, setPrivateKey] = useState("");
  const [smartWalletAddress, setSmartWalletAddress] = useState("");

  const handleConnect = async () => {
    try {
      if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
        throw new Error("Invalid private key format");
      }
      if (!smartWalletAddress.startsWith("0x") || smartWalletAddress.length !== 42) {
        throw new Error("Invalid smart wallet address");
      }

      await connect(privateKey, smartWalletAddress);
      toast({
        title: "Connected Successfully",
        description: "Your wallet has been connected.",
      });
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  if (address) {
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </p>
        <Button variant="outline" size="icon" onClick={() => disconnect()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <Input
              id="privateKey"
              type="password"
              placeholder="0x..."
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="smartWallet">Smart Wallet Address</Label>
            <Input
              id="smartWallet"
              placeholder="0x..."
              value={smartWalletAddress}
              onChange={(e) => setSmartWalletAddress(e.target.value)}
            />
          </div>
          <Button onClick={handleConnect}>
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}