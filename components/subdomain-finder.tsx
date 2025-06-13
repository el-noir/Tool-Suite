"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, AlertTriangle, CheckCircle, Network, Key, Shield, Info } from "lucide-react"
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

interface SSLInfo {
  protocolVersion: string
  cipherSuite: string
  certificateChain: SSLCertificate[]
  weaknesses: string[]
}

interface SubdomainInfo {
  subdomain: string
  ip: string
  ssl: SSLInfo | null
  sslError?: string
}

interface SubdomainResult {
  success: boolean
  data: SubdomainInfo[]
}

// Generate mock data for demonstration
const generateMockSubdomains = (domain: string): SubdomainInfo[] => {
  const now = new Date()
  const validFrom = new Date(now)
  validFrom.setFullYear(validFrom.getFullYear() - 1)

  const validTo = new Date(now)
  validTo.setFullYear(validTo.getFullYear() + 1)

  const mockSSL: SSLInfo = {
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

  // Generate some common subdomains
  const commonSubdomains = ["www", "mail", "blog", "api", "dev", "admin", "shop", "app"]

  return commonSubdomains.map((sub, index) => ({
    subdomain: `${sub}.${domain}`,
    ip: `192.168.1.${10 + index}`,
    ssl: index % 3 === 0 ? null : mockSSL,
    sslError: index % 3 === 0 ? "Could not establish SSL connection" : undefined,
  }))
}

export default function SubdomainFinder() {
  const [domain, setDomain] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SubdomainInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubdomain, setSelectedSubdomain] = useState<SubdomainInfo | null>(null)
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
    setResult(null)
    setSelectedSubdomain(null)
    setUsedMockData(false)

    try {
      console.log(`Sending request to find subdomains for ${domain}`)

      try {
        // Try to fetch from the API
        const response = await fetch(`http://localhost:3000/api/subdomains/find?domain=${encodeURIComponent(domain)}`, {
          // Add a short timeout to fail fast if the API is not available
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`)
        }

        const data: SubdomainResult = await response.json()
        console.log("Subdomain finder response:", data)

        if (data.success && data.data) {
          setResult(data.data)
          if (data.data.length > 0) {
            setSelectedSubdomain(data.data[0])
          }
        } else {
          throw new Error(data.error || "Failed to find subdomains")
        }
      } catch (fetchError) {
        console.warn("API fetch failed, using mock data:", fetchError)

        // If the API is not available, use mock data
        const mockData = generateMockSubdomains(domain)
        setUsedMockData(true)
        setResult(mockData)
        if (mockData.length > 0) {
          setSelectedSubdomain(mockData[0])
        }

        // Don't throw the error, we're handling it with mock data
      }
    } catch (err) {
      console.error("Subdomain finder error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to find subdomains",
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
          <div className="p-3 bg-teal-500 rounded-lg">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Subdomain Finder</h1>
            <p className="text-slate-600 dark:text-slate-400">Discover and analyze subdomains of any domain</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find Subdomains</CardTitle>
            <CardDescription>Enter a domain name to discover its subdomains</CardDescription>
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
                {isLoading ? "Searching..." : "Find Subdomains"}
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
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
                <p className="text-slate-600 dark:text-slate-400">Searching for subdomains...</p>
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

        {result && result.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Discovered Subdomains</CardTitle>
                  <CardDescription>
                    Found {result.length} subdomains for {domain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {result.map((subdomain, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${
                            selectedSubdomain?.subdomain === subdomain.subdomain
                              ? "bg-teal-100 dark:bg-teal-900/30"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                          }`}
                          onClick={() => setSelectedSubdomain(subdomain)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate">{subdomain.subdomain}</div>
                            {subdomain.ssl ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900"
                              >
                                SSL
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900"
                              >
                                No SSL
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">IP: {subdomain.ip}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {selectedSubdomain && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedSubdomain.subdomain}</span>
                      <Badge variant="outline">
                        {selectedSubdomain.ssl ? selectedSubdomain.ssl.protocolVersion : "No SSL"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>IP Address: {selectedSubdomain.ip}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedSubdomain.sslError ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>SSL Error</AlertTitle>
                        <AlertDescription>{selectedSubdomain.sslError}</AlertDescription>
                      </Alert>
                    ) : selectedSubdomain.ssl ? (
                      <Tabs defaultValue="summary">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="summary">SSL Summary</TabsTrigger>
                          <TabsTrigger value="chain">Certificate Chain</TabsTrigger>
                        </TabsList>
                        <TabsContent value="summary" className="mt-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                  <Shield className="h-5 w-5 text-slate-500" />
                                  <div>
                                    <p className="text-sm font-medium">Protocol Version</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {selectedSubdomain.ssl.protocolVersion}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Key className="h-5 w-5 text-slate-500" />
                                  <div>
                                    <p className="text-sm font-medium">Cipher Suite</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {selectedSubdomain.ssl.cipherSuite}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`h-3 w-3 rounded-full ${getExpiryStatusColor(
                                      calculateDaysRemaining(selectedSubdomain.ssl.certificateChain[0]?.validTo),
                                    )}`}
                                  />
                                  <div>
                                    <p className="text-sm font-medium">Certificate Validity</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {(() => {
                                        const days = calculateDaysRemaining(
                                          selectedSubdomain.ssl.certificateChain[0]?.validTo,
                                        )
                                        if (days === null) return "Unknown"
                                        if (days < 0) return "Expired"
                                        return `${days} days remaining`
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Network className="h-5 w-5 text-slate-500" />
                                  <div>
                                    <p className="text-sm font-medium">Issued To</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {selectedSubdomain.ssl.certificateChain[0]?.subject?.CN || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {selectedSubdomain.ssl.weaknesses && selectedSubdomain.ssl.weaknesses.length > 0 ? (
                              <Alert variant="destructive" className="mt-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Security Weaknesses Detected</AlertTitle>
                                <AlertDescription>
                                  <ul className="list-disc pl-5 mt-2">
                                    {selectedSubdomain.ssl.weaknesses.map((weakness, index) => (
                                      <li key={index}>{weakness}</li>
                                    ))}
                                  </ul>
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900 mt-4">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertTitle className="text-green-600 dark:text-green-400">
                                  No Security Weaknesses Detected
                                </AlertTitle>
                                <AlertDescription className="text-green-600/80 dark:text-green-400/80">
                                  The SSL/TLS configuration appears to be secure based on our tests.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </TabsContent>
                        <TabsContent value="chain" className="mt-4">
                          <ScrollArea className="h-[400px] rounded-md border p-4">
                            <div className="space-y-6">
                              {selectedSubdomain.ssl.certificateChain.map((cert, index) => (
                                <div key={index} className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant={index === 0 ? "default" : "secondary"}>
                                      {index === 0
                                        ? "Leaf"
                                        : index === selectedSubdomain.ssl!.certificateChain.length - 1
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
                                  {index < selectedSubdomain.ssl!.certificateChain.length - 1 && (
                                    <div className="flex justify-center my-4">
                                      <div className="border-l-2 border-dashed h-6"></div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No SSL Certificate</AlertTitle>
                        <AlertDescription>
                          This subdomain does not have an SSL/TLS certificate or it could not be analyzed.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {result && result.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Subdomains Found</AlertTitle>
            <AlertDescription>
              No subdomains were discovered for {domain}. Try another domain or check your spelling.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
