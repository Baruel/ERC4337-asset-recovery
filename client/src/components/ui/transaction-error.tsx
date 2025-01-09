import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, XCircle, CheckCircle2, FileCode } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface TransactionErrorProps {
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
    stackTrace?: string;
    fileInfo?: {
      file: string;
      line: number;
      column?: number;
    }[];
  };
}

export function TransactionError({ open, onClose, error }: TransactionErrorProps) {
  const { toast } = useToast();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({
      description: "Copied to clipboard",
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const renderCopyButton = (text: string, section: string) => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => copyToClipboard(text, section)}
      className="h-8 w-8"
    >
      {copiedSection === section ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Transaction Failed
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="error">
                <AccordionTrigger className="text-destructive font-semibold">
                  Error Details
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 flex justify-between items-start">
                    <p className="text-destructive font-medium">{error.message}</p>
                    {renderCopyButton(error.message, 'error')}
                  </div>
                  {error.fileInfo && error.fileInfo.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Error Location:</p>
                      {error.fileInfo.map((loc, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <FileCode className="h-4 w-4" />
                          <span className="font-mono">
                            {loc.file}:{loc.line}{loc.column ? `:${loc.column}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {error.network && (
                <AccordionItem value="network">
                  <AccordionTrigger>Network Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Network</p>
                          <p className="font-medium">{error.network.name}</p>
                        </div>
                        <Badge variant="outline">Chain ID: {error.network.chainId}</Badge>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {error.endpoint && (
                <AccordionItem value="request">
                  <AccordionTrigger>Request Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {error.endpoint}
                        </code>
                        {renderCopyButton(error.endpoint, 'endpoint')}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {error.userOperation && (
                <AccordionItem value="userOp">
                  <AccordionTrigger>User Operation</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm w-full">
                          {JSON.stringify(error.userOperation, null, 2)}
                        </pre>
                        {renderCopyButton(JSON.stringify(error.userOperation, null, 2), 'userOp')}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {error.stackTrace && (
                <AccordionItem value="stack">
                  <AccordionTrigger>Stack Trace</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono w-full whitespace-pre-wrap">
                          {error.stackTrace}
                        </pre>
                        {renderCopyButton(error.stackTrace, 'stackTrace')}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {error.rawError && (
                <AccordionItem value="raw">
                  <AccordionTrigger>Raw Error Response</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono w-full">
                          {error.rawError}
                        </pre>
                        {renderCopyButton(error.rawError, 'rawError')}
                      </div>
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