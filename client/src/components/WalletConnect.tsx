import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { Wallet, LogOut } from "lucide-react";
import { walletConnect } from "wagmi/connectors";

export default function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      connect({
        connector: walletConnect({
          projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'
        })
      });
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Button onClick={handleConnect} className="w-full">
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <p className="text-sm text-muted-foreground">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </p>
      <Button variant="outline" size="icon" onClick={() => disconnect()}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}