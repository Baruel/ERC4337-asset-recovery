import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from 'wagmi';
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/web3";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Validate from "@/pages/Validate";
import { Button } from "@/components/ui/button";
import { FileCode2 } from "lucide-react";
import { Link } from "wouter";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="fixed top-4 right-4 z-50">
          <Link href="/validate">
            <Button variant="outline" size="sm" className="gap-2">
              <FileCode2 className="h-4 w-4" />
              Validation Playground
            </Button>
          </Link>
        </div>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/validate" component={Validate} />
        </Switch>
        <Toaster />
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;