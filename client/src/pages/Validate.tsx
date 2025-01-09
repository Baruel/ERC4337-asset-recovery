import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ValidationError {
  field: string;
  message: string;
}

interface UserOperationFields {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export default function Validate() {
  const [userOp, setUserOp] = useState<UserOperationFields>({
    sender: "",
    nonce: "",
    initCode: "",
    callData: "",
    callGasLimit: "",
    verificationGasLimit: "",
    preVerificationGas: "",
    maxFeePerGas: "",
    maxPriorityFeePerGas: "",
    paymasterAndData: "",
    signature: ""
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateField = (field: string, value: string): string | null => {
    if (!value) return `${field} is required`;

    // Common validation for hex values
    if (!value.startsWith("0x")) {
      return `${field} must start with 0x`;
    }

    switch (field) {
      case "sender":
        if (value.length !== 42) return "Sender must be a valid Ethereum address (42 characters)";
        if (!/^0x[0-9a-fA-F]{40}$/.test(value)) return "Sender must be a valid hex string";
        break;
      case "nonce":
        if (!/^0x[0-9a-fA-F]+$/.test(value)) return "Nonce must be a valid hex string";
        break;
      case "initCode":
      case "callData":
      case "paymasterAndData":
      case "signature":
        if (!/^0x[0-9a-fA-F]*$/.test(value)) return "Must be a valid hex string";
        break;
      case "callGasLimit":
      case "verificationGasLimit":
      case "preVerificationGas":
      case "maxFeePerGas":
      case "maxPriorityFeePerGas":
        if (!/^0x[0-9a-fA-F]+$/.test(value)) return "Must be a valid hex number";
        break;
    }

    return null;
  };

  const handleChange = (field: keyof UserOperationFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserOp(prev => ({ ...prev, [field]: value }));

    const error = validateField(field, value);
    setErrors(prev => {
      const filtered = prev.filter(e => e.field !== field);
      if (error) {
        return [...filtered, { field, message: error }];
      }
      return filtered;
    });
  };

  const getFieldError = (field: string) => {
    return errors.find(e => e.field === field)?.message;
  };

  const isFieldValid = (field: string) => {
    return userOp[field as keyof UserOperationFields] && !getFieldError(field);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          User Operation Validation Playground
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Validate ERC-4337 User Operation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(Object.keys(userOp) as Array<keyof UserOperationFields>).map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field} className="flex items-center gap-2">
                  {field}
                  {userOp[field] && (
                    isFieldValid(field) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )
                  )}
                </Label>
                <Input
                  id={field}
                  value={userOp[field]}
                  onChange={handleChange(field)}
                  placeholder={`0x...`}
                  className={getFieldError(field) ? "border-destructive" : ""}
                />
                {getFieldError(field) && (
                  <p className="text-sm text-destructive">{getFieldError(field)}</p>
                )}
              </div>
            ))}

            <div className="pt-4">
              <Button
                className="w-full"
                disabled={errors.length > 0 || Object.values(userOp).some(v => !v)}
              >
                Validate Operation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
