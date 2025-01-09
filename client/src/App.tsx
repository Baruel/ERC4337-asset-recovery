import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from 'wagmi';
import { queryClient } from "./lib/queryClient";
import { config } from "./lib/web3";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Validate from "@/pages/Validate";
import ConfigurationPage from "@/pages/ConfigurationPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileCode2, Settings, AlertCircle } from "lucide-react";
import { Link } from "wouter";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <Link href="/config">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Provider Settings
            </Button>
          </Link>
          <Link href="/validate">
            <Button variant="outline" size="sm" className="gap-2">
              <FileCode2 className="h-4 w-4" />
              Validation Playground
            </Button>
          </Link>
        </div>
        <Switch>
          <Route path="/config" component={ConfigurationPage} />
          <Route path="/" component={Home} />
          <Route path="/validate" component={Validate} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </WagmiProvider>
    </QueryClientProvider>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;