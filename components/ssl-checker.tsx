"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function XSSTester() {
  const [payload, setPayload] = useState("");
  const [storedPayload, setStoredPayload] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate storing the payload (in a real app, this would be sent to a backend)
      setStoredPayload(payload);

      toast({
        title: "Payload stored successfully",
        description: "The XSS payload will execute when rendered.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to store payload",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>XSS TESTER</CardTitle>
          <CardDescription>
            Submit a payload to test for stored XSS vulnerabilities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Enter XSS payload (e.g., <script>alert(1)</script>)"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="font-mono"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Storing..." : "Store Payload"}
            </Button>
          </form>

          {/* Vulnerable Rendering of Stored Payload */}
          {storedPayload && (
            <div className="mt-6 p-4 border rounded bg-gray-100">
              <h3 className="font-bold mb-2">Stored Payload Preview:</h3>
              <div dangerouslySetInnerHTML={{ __html: storedPayload }} />
            </div>
          )}

          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This component intentionally renders unsanitized input to demonstrate XSS vulnerabilities. Do not use this in production.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
