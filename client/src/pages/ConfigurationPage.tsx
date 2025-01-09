import { useState } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useBundlerConfig } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const configSchema = z.object({
  alchemyApiKey: z.string()
    .min(32, "API key appears to be too short")
    .max(64, "API key appears to be too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "API key contains invalid characters"),
  usePaymaster: z.boolean().default(false),
});

type ConfigurationForm = z.infer<typeof configSchema>;

export default function ConfigurationPage() {
  const { toast } = useToast();
  const bundlerConfig = useBundlerConfig();
  const [isConfigured, setIsConfigured] = useState(false);

  const form = useForm<ConfigurationForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      alchemyApiKey: "",
      usePaymaster: false,
    },
  });

  const onSubmit = async (data: ConfigurationForm) => {
    try {
      await bundlerConfig.mutateAsync({
        type: "alchemy",
        apiKey: data.alchemyApiKey,
        paymasterUrl: data.usePaymaster ? "/api/paymaster" : undefined,
      });

      setIsConfigured(true);
      toast({
        title: "Configuration updated",
        description: "Your provider settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Configuration failed",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
          <CardDescription>
            Configure your blockchain provider settings to start using the application.
            This is a one-time setup required to interact with the networks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Information about Alchemy */}
          <div className="rounded-lg bg-blue-50 p-4 text-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold">Why do I need an Alchemy API key?</h4>
                <div className="text-sm space-y-2">
                  <p>
                    Alchemy is a blockchain infrastructure provider that enables secure and reliable access to various blockchain networks.
                    Your API key is required to:
                  </p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Connect to multiple blockchain networks reliably</li>
                    <li>Execute transactions securely</li>
                    <li>Ensure stable connection to the blockchain</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="alchemyApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alchemy API Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your Alchemy API key" 
                        {...field}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription className="space-y-2">
                      <p>To get your Alchemy API key:</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Visit the{" "}
                          <a
                            href="https://dashboard.alchemy.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline inline-flex items-center gap-1"
                          >
                            Alchemy Dashboard
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                        <li>Create a free account or sign in</li>
                        <li>Create a new app for any network (the key works for all networks)</li>
                        <li>Copy the API Key from your app's dashboard</li>
                      </ol>
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usePaymaster"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel className="text-base">Use Paymaster Service</FormLabel>
                        <FormDescription>
                          Enable this to use a paymaster service for transaction fees.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>

                    <div className="rounded-lg bg-orange-50 p-4 text-orange-800">
                      <h4 className="font-semibold mb-2">About Paymaster Usage</h4>
                      <div className="text-sm space-y-2">
                        <p>
                          <strong>With Paymaster (ON):</strong> Transaction fees will be sponsored by the paymaster service.
                          This is useful for testing but may have limitations or restrictions.
                        </p>
                        <p>
                          <strong>Without Paymaster (OFF):</strong> You'll need to fund your smart wallet with native tokens
                          (ETH, MATIC, etc.) to pay for transaction fees. This gives you more control and reliability.
                          We recommend this option for production use.
                        </p>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={bundlerConfig.isPending}
              >
                {bundlerConfig.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Configuration...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>

              {isConfigured && (
                <div className="rounded-lg bg-green-50 p-4 text-green-800">
                  <h4 className="font-semibold mb-2">✓ Configuration Saved Successfully</h4>
                  <div className="text-sm space-y-2">
                    <p>
                      Your provider settings have been updated. You can now proceed to use the application.
                    </p>
                    {!form.getValues("usePaymaster") && (
                      <p>
                        <strong>Important:</strong> Since you've disabled the paymaster,
                        remember to fund your smart wallet with native tokens (ETH, MATIC, etc.) to pay for transaction fees.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}