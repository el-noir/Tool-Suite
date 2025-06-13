"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Globe,
  Server,
  Mail,
  FileText,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface DnsRecord {
  recordType: string
  records: string[]
  error?: string
}

interface DnsScanResult {
  hostname: string
  timestamp: string
  results: DnsRecord[]
}

interface ApiScanResult {
  "scan descriptor": {
    id: string
    scanname: string
    timedate: string
    hostname: string
    parameters: string[]
  }
  "scan results": Record<string, string[] | string>
}

const DNS_RECORD_TYPES = [
  { id: "A", label: "A Records", description: "IPv4 addresses", icon: Globe },
  { id: "AAAA", label: "AAAA Records", description: "IPv6 addresses", icon: Globe },
  { id: "CNAME", label: "CNAME Records", description: "Canonical names", icon: Server },
  { id: "MX", label: "MX Records", description: "Mail exchange servers", icon: Mail },
  { id: "NS", label: "NS Records", description: "Name servers", icon: Server },
  { id: "TXT", label: "TXT Records", description: "Text records", icon: FileText },
  { id: "SOA", label: "SOA Records", description: "Start of authority", icon: Shield },
]

// API endpoint
const API_BASE_URL = "http://127.0.0.1:4444"

export default function EnhancedDNSFinder() {
  const [hostname, setHostname] = useState("")
  const [selectedRecords, setSelectedRecords] = useState<string[]>(["A", "AAAA", "MX", "NS"])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<DnsScanResult | null>(null)
  const [error, setError] = useState("")
  const [scanId, setScanId] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const { toast } = useToast()

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // Poll for scan results if we have a scanId
  useEffect(() => {
    if (scanId && scanning) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/finishedScans?id=${scanId}`)
          const data = await response.json()

          if (data && data.length > 0) {
            // Scan is complete
            clearInterval(interval)
            setPollingInterval(null)
            setScanning(false)
            setProgress(100)

            // Process the results
            const scanResult = data[0]
            processApiResults(scanResult)
          } else {
            // Update progress while waiting
            setProgress((prev) => {
              const newProgress = prev + 5
              return newProgress > 90 ? 90 : newProgress
            })
          }
        } catch (err) {
          console.error("Error polling for scan results:", err)
        }
      }, 1000)

      setPollingInterval(interval)
      return () => clearInterval(interval)
    }
  }, [scanId, scanning])

  const handleRecordToggle = (recordType: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordType) ? prev.filter((r) => r !== recordType) : [...prev, recordType],
    )
  }

  const processApiResults = (apiResult: ApiScanResult) => {
    const scanResults = apiResult["scan results"]
    const scanDescriptor = apiResult["scan descriptor"]

    const formattedResults: DnsRecord[] = []

    // Process each record type
    for (const recordType of scanDescriptor.parameters) {
      const recordResult = scanResults[recordType]

      if (typeof recordResult === "string" && recordResult.startsWith("Error:")) {
        // Handle error case
        formattedResults.push({
          recordType,
          records: [],
          error: recordResult.substring(7), // Remove "Error: " prefix
        })
      } else {
        // Handle success case
        const records = Array.isArray(recordResult)
          ? recordResult
          : typeof recordResult === "string"
            ? [recordResult]
            : []

        formattedResults.push({
          recordType,
          records: records.map((r) => String(r)),
        })
      }
    }

    const result: DnsScanResult = {
      hostname: scanDescriptor.hostname,
      timestamp: scanDescriptor.timedate,
      results: formattedResults,
    }

    setResults(result)

    toast({
      title: "Scan Complete",
      description: `DNS scan completed for ${scanDescriptor.hostname}`,
    })
  }

  const handleScan = async () => {
    if (!hostname.trim()) {
      setError("Please enter a hostname")
      return
    }

    if (selectedRecords.length === 0) {
      setError("Please select at least one record type")
      return
    }

    setScanning(true)
    setError("")
    setResults(null)
    setProgress(10)
    setScanId(null)

    try {
      // First, check if the API is available
      try {
        await fetch(`${API_BASE_URL}/dnsScanner`, { method: "GET" })
      } catch (err) {
        throw new Error(`Cannot connect to DNS Scanner API at ${API_BASE_URL}. Make sure the server is running.`)
      }

      // Start the scan
      const response = await fetch(`${API_BASE_URL}/dnsScanner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: hostname.trim(),
          scanType: "dnsscan",
          ...selectedRecords.reduce((acc, record) => ({ ...acc, [record]: true }), {}),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to start DNS scan")
      }

      setProgress(30)

      // Get the list of running scans to find our scan ID
      const runningScansResponse = await fetch(`${API_BASE_URL}/runningScans`)
      const runningScans = await runningScansResponse.json()

      // Find our scan (most recent one for this hostname)
      const ourScans = runningScans
        .filter((scan: any) => scan.hostname === hostname.trim() && scan.scanname === "dnsscan")
        .sort((a: any, b: any) => new Date(b.timedate).getTime() - new Date(a.timedate).getTime())

      if (ourScans.length > 0) {
        setScanId(ourScans[0].id)
        setProgress(40)
      } else {
        // If we can't find our scan in running scans, check finished scans
        // (it might have completed very quickly)
        const finishedScansResponse = await fetch(`${API_BASE_URL}/finishedScans`)
        const finishedScans = await finishedScansResponse.json()

        const ourFinishedScans = finishedScans
          .filter(
            (scan: any) =>
              scan["scan descriptor"].hostname === hostname.trim() && scan["scan descriptor"].scanname === "dnsscan",
          )
          .sort(
            (a: any, b: any) =>
              new Date(b["scan descriptor"].timedate).getTime() - new Date(a["scan descriptor"].timedate).getTime(),
          )

        if (ourFinishedScans.length > 0) {
          // Scan already completed
          setScanning(false)
          setProgress(100)
          processApiResults(ourFinishedScans[0])
        } else {
          throw new Error("Could not find the scan in running or finished scans")
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during the scan")
      setScanning(false)
      setProgress(0)
      toast({
        title: "Scan Failed",
        description: err.message || "An error occurred during the scan",
        variant: "destructive",
      })
    }
  }

  const copyResults = () => {
    if (!results) return

    const text = results.results
      .map((result) => {
        const records = result.error ? [`Error: ${result.error}`] : result.records
        return `${result.recordType}:\n${records.map((r) => `  ${r}`).join("\n")}`
      })
      .join("\n\n")

    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "DNS scan results copied to clipboard",
    })
  }

  const downloadResults = () => {
    if (!results) return

    const jsonData = JSON.stringify(results, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dns-scan-${results.hostname}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download Started",
      description: "DNS scan results downloaded",
    })
  }

  const getRecordIcon = (recordType: string) => {
    const record = DNS_RECORD_TYPES.find((r) => r.id === recordType)
    return record?.icon || FileText
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-purple-500 rounded-lg">
              <Search className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">DNS Finder</h1>
              <p className="text-slate-600 dark:text-slate-400">Comprehensive DNS lookup and domain analysis</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Scan Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>DNS Scan Configuration</CardTitle>
                <CardDescription>Configure your DNS reconnaissance scan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hostname">Target Hostname</Label>
                  <Input
                    id="hostname"
                    placeholder="example.com"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    disabled={scanning}
                  />
                  <p className="text-xs text-muted-foreground">Enter a domain name (e.g., google.com, github.com)</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>DNS Record Types</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {DNS_RECORD_TYPES.map((record) => {
                      const IconComponent = record.icon
                      return (
                        <div key={record.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={record.id}
                            checked={selectedRecords.includes(record.id)}
                            onCheckedChange={() => handleRecordToggle(record.id)}
                            disabled={scanning}
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <IconComponent className="h-4 w-4 text-purple-500" />
                            <div>
                              <Label htmlFor={record.id} className="text-sm font-medium cursor-pointer">
                                {record.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">{record.description}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleScan}
                  disabled={scanning || !hostname.trim() || selectedRecords.length === 0}
                  className="w-full"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Start DNS Scan
                    </>
                  )}
                </Button>

                {scanning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Scanning DNS records...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-6">
            {results && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                        DNS Scan Results
                      </CardTitle>
                      <CardDescription>
                        Scan completed for {results.hostname} at {new Date(results.timestamp).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={copyResults}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadResults}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {results.results.map((result, index) => {
                        const IconComponent = getRecordIcon(result.recordType)
                        return (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <IconComponent className="h-5 w-5 text-purple-500" />
                              <h3 className="font-semibold">{result.recordType} Records</h3>
                              <Badge variant={result.error ? "destructive" : "default"}>
                                {result.error ? "Error" : `${result.records.length} found`}
                              </Badge>
                            </div>

                            {result.error ? (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{result.error}</AlertDescription>
                              </Alert>
                            ) : result.records.length > 0 ? (
                              <div className="space-y-2">
                                {result.records.map((record, recordIndex) => (
                                  <div
                                    key={recordIndex}
                                    className="bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono text-sm"
                                  >
                                    {record}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm">No records found</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {!results && !scanning && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                  <p className="text-muted-foreground text-center">
                    Configure your scan settings and click "Start DNS Scan" to begin
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
