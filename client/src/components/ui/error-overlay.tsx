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

interface ErrorDetails {
  userOperation?: Record<string, any>;
  network?: {
    name: string;
    chainId: number;
  };
  endpoint?: string;
  message: string;
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
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2">
                <p className="font-medium text-foreground">Error Message:</p>
                <p className="text-destructive">{details.message}</p>
              </div>

              {details.network && (
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Network:</p>
                  <p>Name: {details.network.name}</p>
                  <p>Chain ID: {details.network.chainId}</p>
                </div>
              )}

              {details.endpoint && (
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Endpoint:</p>
                  <p className="font-mono text-sm">{details.endpoint}</p>
                </div>
              )}

              {details.userOperation && (
                <div className="space-y-2">
                  <p className="font-medium text-foreground">User Operation:</p>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(details.userOperation, null, 2)}
                  </pre>
                </div>
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