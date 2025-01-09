import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ErrorDetails {
  userOperation?: Record<string, any>;
  network?: {
    name: string;
    chainId: number;
  };
  endpoint?: string;
  message: string;
  rawError?: string;
}

interface ErrorOverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  details: ErrorDetails;
}

export function ErrorOverlay({
  open,
  onClose,
  title = "Transaction Failed",
  details,
}: ErrorOverlayProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-3xl max-h-[80vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <ScrollArea className="h-[60vh]">
            <AlertDialogDescription className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-base">Error Message</h3>
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  <p className="text-destructive font-medium">{details.message}</p>
                </div>
              </div>

              <Separator />

              {details.network && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-base">Network Information</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Network Name</p>
                      <p className="font-medium">{details.network.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Chain ID</p>
                      <p className="font-medium">{details.network.chainId}</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {details.endpoint && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-base">Request Details</h3>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Endpoint</p>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {details.endpoint}
                    </code>
                  </div>
                </div>
              )}

              <Separator />

              {details.userOperation && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-base">User Operation</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(details.userOperation, null, 2)}
                  </pre>
                </div>
              )}

              {details.rawError && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground text-base">Raw Error Response</h3>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
                      {details.rawError}
                    </pre>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </ScrollArea>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}