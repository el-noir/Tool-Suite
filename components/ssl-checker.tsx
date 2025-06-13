"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Key, Shield, AlertTriangle, CheckCircle, Calendar, Lock, Server, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SSLCertificate {
  issuer: {
    C?: string
    O?: string
    CN?: string
    OU?: string
  }
  subject: {
    C?: string
    O?: string
    CN?: string
    OU?: string
  }
  validFrom: string
  validTo: string
  serialNumber: string
  fingerprint: string
}

interface SSLCheckResult {
  target: string
  protocolVersion: string
  cipherSuite: string
  certificateChain: SSLCertificate[]
  weaknesses: string[]
}

// Mock data for demonstration when API is not available
const generateMockData = (domain: string): SSLCheckResult => {
  const now = new Date()
  const validFrom = new Date(now)
  validFrom.setFullYear(validFrom.getFullYear() - 1)

  const validTo = new Date(now)
  validTo.setFullYear(validTo.getFullYear() + 1)

  return {
    target: domain,
    protocolVersion: "TLSv1.3",
    cipherSuite: "TLS_AES_256_GCM_SHA384",
    certificateChain: [
      {
        issuer: {
          C: "US",
          O: "Let's Encrypt",
          CN: "R3",
        },
        subject: {
          C: "US",
          O: domain.split(".")[0],
          CN: domain,
        },
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        serialNumber: "03:a1:b2:c3:d4:e5:f6:a7:b8:c9:d0:e1:f2:a3:b4:c5",
        fingerprint: "SHA256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      },
      {
        issuer: {
          C: "US",
          O: "Internet Security Research Group",
          CN: "ISRG Root X1",
        },
        subject: {
          C: "US",
          O: "Let's Encrypt",
          CN: "R3",
        },
        validFrom: "2020-09-04T00:00:00.000Z",
        validTo: "2025-09-15T16:00:00.000Z",
        serialNumber: "91:2b:08:4a:cf:0c:18:a7:53:f6:d6:2e:25:a7:5f:5a",
        fingerprint: "SHA256:e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      },
    ],
    weaknesses: [],
  }
}

export default function SSLChecker() {
  const [domain, setDomain] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SSLCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [usedMockData, setUsedMockData] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!domain) {
      toast({
        title: "Error",
        description: "Please enter a domain",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setUsedMockData(false)

    try {
      console.log(`Sending request to check SSL for ${domain}`)

      try {
        // Try to fetch from the API
        const response = await fetch(`http://localhost:3000/api/ssl/check?target=${encodeURIComponent(domain)}`, {
          // Add a short timeout to fail fast if the API is not available
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("SSL check response:", data)

        if (data.success) {
          setResult(data.data)
        } else {
          throw new Error(data.error || "Failed to check SSL certificate")
        }
      } catch (fetchError) {
        console.warn("API fetch failed, using mock data:", fetchError)

        // If the API is not available, use mock data
        setUsedMockData(true)
        setResult(generateMockData(domain))

        // Don't throw the error, we're handling it with mock data
      }
    } catch (err) {
      console.error("SSL check error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to check SSL certificate",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  const calculateDaysRemaining = (validTo: string) => {
    try {
      const expiryDate = new Date(validTo)
      const today = new Date()
      const diffTime = expiryDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch (e) {
      return null
    }
  }

  const getExpiryStatusColor = (daysRemaining: number | null) => {
    if (daysRemaining === null) return "bg-gray-500"
    if (daysRemaining < 0) return "bg-red-500"
    if (daysRemaining < 30) return "bg-amber-500"
    return "bg-green-500"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-500 rounded-lg">
            <Key className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">SSL Certificate Checker</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Analyze SSL/TLS certificates for security and compliance
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Check SSL Certificate</CardTitle>
            <CardDescription>Enter a domain name to analyze its SSL/TLS certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Checking..." : "Check"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <Card>
            <CardContent className="py-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                <p className="text-slate-600 dark:text-slate-400">Analyzing SSL certificate...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {usedMockData && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>
              The API server is not available. Showing demonstration data for preview purposes.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Certificate Summary for {result.target}</span>
                  <Badge variant="outline" className="ml-2">
                    {result.protocolVersion}
                  </Badge>
                </CardTitle>
                <CardDescription>Overview of the SSL/TLS certificate information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">Protocol Version</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{result.protocolVersion}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Lock className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">Cipher Suite</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{result.cipherSuite}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Server className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">Issued To</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {result.certificateChain[0]?.subject?.CN || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">Valid From</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(result.certificateChain[0]?.validFrom)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">Valid Until</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(result.certificateChain[0]?.validTo)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-3 w-3 rounded-full ${getExpiryStatusColor(calculateDaysRemaining(result.certificateChain[0]?.validTo))}`}
                      />
                      <div>
                        <p className="text-sm font-medium">Expiry Status</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {(() => {
                            const days = calculateDaysRemaining(result.certificateChain[0]?.validTo)
                            if (days === null) return "Unknown"
                            if (days < 0) return "Expired"
                            return `${days} days remaining`
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {result.weaknesses && result.weaknesses.length > 0 && (
                  <div className="mt-6">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Security Weaknesses Detected</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5 mt-2">
                          {result.weaknesses.map((weakness, index) => (
                            <li key={index}>{weakness}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {result.weaknesses && result.weaknesses.length === 0 && (
                  <div className="mt-6">
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertTitle className="text-green-600 dark:text-green-400">
                        No Security Weaknesses Detected
                      </AlertTitle>
                      <AlertDescription className="text-green-600/80 dark:text-green-400/80">
                        The SSL/TLS configuration appears to be secure based on our tests.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="chain">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chain">Certificate Chain</TabsTrigger>
                <TabsTrigger value="details">Certificate Details</TabsTrigger>
              </TabsList>
              <TabsContent value="chain" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Certificate Chain</CardTitle>
                    <CardDescription>The complete certificate chain from leaf to root</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] rounded-md border p-4">
                      <div className="space-y-6">
                        {result.certificateChain.map((cert, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={index === 0 ? "default" : "secondary"}>
                                {index === 0
                                  ? "Leaf"
                                  : index === result.certificateChain.length - 1
                                    ? "Root"
                                    : "Intermediate"}
                              </Badge>
                              <h3 className="font-medium">{cert.subject.CN || "Unknown"}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pl-6">
                              <div>
                                <span className="font-medium">Issuer:</span> {cert.issuer.O}{" "}
                                {cert.issuer.CN ? `(${cert.issuer.CN})` : ""}
                              </div>
                              <div>
                                <span className="font-medium">Subject:</span> {cert.subject.O}{" "}
                                {cert.subject.CN ? `(${cert.subject.CN})` : ""}
                              </div>
                              <div>
                                <span className="font-medium">Valid From:</span> {formatDate(cert.validFrom)}
                              </div>
                              <div>
                                <span className="font-medium">Valid To:</span> {formatDate(cert.validTo)}
                              </div>
                              <div>
                                <span className="font-medium">Serial Number:</span>{" "}
                                <span className="font-mono text-xs">{cert.serialNumber}</span>
                              </div>
                              <div>
                                <span className="font-medium">Fingerprint:</span>{" "}
                                <span className="font-mono text-xs">{cert.fingerprint}</span>
                              </div>
                            </div>
                            {index < result.certificateChain.length - 1 && (
                              <div className="flex justify-center my-4">
                                <div className="border-l-2 border-dashed h-6"></div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Certificate Details</CardTitle>
                    <CardDescription>Detailed information about the leaf certificate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Subject Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                          {Object.entries(result.certificateChain[0]?.subject || {}).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value as string}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Issuer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                          {Object.entries(result.certificateChain[0]?.issuer || {}).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value as string}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Validity Period</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                          <div>
                            <span className="font-medium">Valid From:</span>{" "}
                            {formatDate(result.certificateChain[0]?.validFrom)}
                          </div>
                          <div>
                            <span className="font-medium">Valid To:</span>{" "}
                            {formatDate(result.certificateChain[0]?.validTo)}
                          </div>
                          <div>
                            <span className="font-medium">Days Remaining:</span> {(() => {
                              const days = calculateDaysRemaining(result.certificateChain[0]?.validTo)
                              if (days === null) return "Unknown"
                              if (days < 0) return `Expired ${Math.abs(days)} days ago`
                              return `${days} days`
                            })()}
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-2">Certificate Identifiers</h3>
                        <div className="space-y-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                          <div>
                            <span className="font-medium">Serial Number:</span>{" "}
                            <span className="font-mono">{result.certificateChain[0]?.serialNumber}</span>
                          </div>
                          <div>
                            <span className="font-medium">Fingerprint:</span>{" "}
                            <span className="font-mono">{result.certificateChain[0]?.fingerprint}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
