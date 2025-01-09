import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { XCircle, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TransactionErrorDisplayProps {
  open: boolean;
  onClose: () => void;
  error: {
    message: string;
    userOperation?: Record<string, any>;
    network?: {
      name: string;
      chainId: number;
    };
    endpoint?: string;
    rawError?: string;
  };
}

function getHumanReadableError(error: string): { title: string; description: string } {
  if (error.includes("sender is not a contract and initCode is empty")) {
    return {
      title: "Smart Wallet Not Deployed",
      description: "Your smart wallet contract needs to be deployed first. This will happen automatically with your first transaction."
    };
  }
  if (error.includes("insufficient funds")) {
    return {
      title: "Insufficient Funds",
      description: "You don't have enough funds to pay for the transaction gas fees. Consider using a paymaster or adding more funds."
    };
  }
  if (error.includes("invalid signature")) {
    return {
      title: "Invalid Signature",
      description: "The transaction signature is invalid. This could happen if the wallet connection was lost or the private key changed."
    };
  }
  if (error.includes("nonce")) {
    return {
      title: "Invalid Transaction Sequence",
      description: "There was an issue with the transaction sequence number (nonce). Try refreshing the page and sending the transaction again."
    };
  }
  // Default case
  return {
    title: "Transaction Failed",
    description: "The transaction could not be processed. Please check the details below for more information."
  };
}

export function TransactionErrorDisplay({ open, onClose, error }: TransactionErrorDisplayProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const humanReadableError = getHumanReadableError(error.message);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ description: "Copied to clipboard" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({ 
        description: "Failed to copy to clipboard", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            {humanReadableError.title}
          </DialogTitle>
          <div className="text-muted-foreground text-sm">
            {humanReadableError.description}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-4">
            <Accordion type="single" collapsible className="w-full">
              {/* Raw Error Message */}
              <AccordionItem value="error">
                <AccordionTrigger>Technical Details</AccordionTrigger>
                <AccordionContent>
                  <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 flex justify-between items-start">
                    <p className="text-destructive font-medium">{error.message}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(error.message, 'message')}
                      className="h-8 w-8 flex-shrink-0"
                    >
                      {copiedField === 'message' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Network Information */}
              {error.network && (
                <AccordionItem value="network">
                  <AccordionTrigger>Network Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Network</p>
                        <Badge variant="secondary">{error.network.name}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Chain ID</p>
                        <Badge variant="outline">{error.network.chainId}</Badge>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* User Operation */}
              {error.userOperation && (
                <AccordionItem value="userOp">
                  <AccordionTrigger>Transaction Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Sender Address</p>
                          <code className="text-xs bg-muted p-1 rounded">
                            {error.userOperation.sender}
                          </code>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Nonce</p>
                          <code className="text-xs bg-muted p-1 rounded">
                            {error.userOperation.nonce}
                          </code>
                        </div>
                      </div>
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                          {JSON.stringify(error.userOperation, null, 2)}
                        </pre>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(JSON.stringify(error.userOperation, null, 2), 'userOp')}
                          className="absolute top-2 right-2"
                        >
                          {copiedField === 'userOp' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Raw Error Response */}
              {error.rawError && (
                <AccordionItem value="rawError">
                  <AccordionTrigger>Raw Error Response</AccordionTrigger>
                  <AccordionContent>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap break-all">
                        {typeof error.rawError === 'string' ? error.rawError : JSON.stringify(error.rawError, null, 2)}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(
                          typeof error.rawError === 'string' ? error.rawError : JSON.stringify(error.rawError, null, 2),
                          'rawError'
                        )}
                        className="absolute top-2 right-2"
                      >
                        {copiedField === 'rawError' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}