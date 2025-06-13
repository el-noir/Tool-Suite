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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/xss-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: payload }),
      });

      if (!response.ok) {
        throw new Error('Failed to send payload');
      }

      toast({
        title: "Payload sent successfully",
        description: "Check your backend console for logs",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send payload",
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
          <CardTitle>XSS Payload Tester</CardTitle>
          <CardDescription>
            Submit XSS payloads to test backend detection
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
              {isLoading ? "Sending..." : "Send Payload"}
            </Button>
          </form>

          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              This will only send the payload to the backend. Check your server console for detection logs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
