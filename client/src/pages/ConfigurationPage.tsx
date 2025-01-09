import { useState } from "react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { useBundlerConfig } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ExternalLink } from "lucide-react";

interface ConfigurationForm {
  alchemyApiKey: string;
  usePaymaster: boolean;
}

export default function ConfigurationPage() {
  const { toast } = useToast();
  const bundlerConfig = useBundlerConfig();
  const [isConfigured, setIsConfigured] = useState(false);

  const form = useForm<ConfigurationForm>({
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
        description: "Your bundler settings have been saved successfully.",
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
          <CardTitle>Account Abstraction Configuration</CardTitle>
          <CardDescription>
            Configure your wallet settings to interact with the blockchain networks.
            This configuration is required before you can start using the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-blue-50 p-4 text-blue-800 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-2">Why do I need an Alchemy API key?</h4>
                <p className="text-sm">
                  Alchemy is a blockchain infrastructure provider that allows us to interact with various blockchain networks.
                  Your API key ensures reliable and secure access to these networks.
                </p>
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
                      <Input placeholder="Enter your Alchemy API key" {...field} />
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
                        <li>Create a new app for the networks you want to use</li>
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
                        <FormLabel className="text-base">Use Paymaster</FormLabel>
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
                          This is useful for testing but may have limitations.
                        </p>
                        <p>
                          <strong>Without Paymaster (OFF):</strong> You'll need to fund your smart wallet with tokens
                          to pay for transaction fees. This gives you more control and reliability.
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
                {bundlerConfig.isPending ? "Saving..." : "Save Configuration"}
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
                        remember to fund your smart wallet with tokens to pay for transaction fees.
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