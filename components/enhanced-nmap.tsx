"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Network, ArrowLeft, Loader2, CheckCircle, AlertCircle, Copy, Download, Shield, Server } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface PortResult {
  port: number | string
  proto: string
  state: string
  service?: string
  version?: string
}

interface NetworkScanResult {
  hostname: string
  timestamp: string
  scanType: string[]
  ports: PortResult[]
  summary: {
    totalPorts: number
    openPorts: number
    closedPorts: number
    filteredPorts: number
  }
}

interface ApiScanResult {
  "scan descriptor": {
    id: string
    scanname: string
    timedate: string
    hostname: string
    parameters: string[]
  }
  "scan results": {
    ports: PortResult[]
    hostname: string
    error?: string
  }
}

const SCAN_TECHNIQUES = [
  { id: "-sT", label: "TCP Connect Scan", description: "Full TCP connection scan" },
  { id: "-sS", label: "TCP SYN Scan", description: "Stealth SYN scan (requires privileges)" },
  { id: "-sU", label: "UDP Scan", description: "UDP port scan" },
]

const PORT_RANGES = [
  { id: "-p1-1000", label: "Common Ports", description: "Top 100 most common ports" },
  { id: "-p-", label: "Extended Range", description: "Extended port range (1-10000)" },
]

const ADDITIONAL_OPTIONS = [
  { id: "-sV", label: "Service Detection", description: "Detect service versions" },
  { id: "-sC", label: "Default Scripts", description: "Run default Nmap scripts" },
]

// API endpoint
const API_BASE_URL = "http://127.0.0.1:4444"

export default function EnhancedNmap() {
  const [hostname, setHostname] = useState("")
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>(["-sT"])
  const [portRange, setPortRange] = useState("-p1-1000")
  const [additionalOptions, setAdditionalOptions] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<NetworkScanResult | null>(null)
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
              const newProgress = prev + 2
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

  const handleTechniqueToggle = (technique: string) => {
    setSelectedTechniques((prev) =>
      prev.includes(technique) ? prev.filter((t) => t !== technique) : [...prev, technique],
    )
  }

  const handleOptionToggle = (option: string) => {
    setAdditionalOptions((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]))
  }

  const processApiResults = (apiResult: ApiScanResult) => {
    const scanResults = apiResult["scan results"]
    const scanDescriptor = apiResult["scan descriptor"]

    if (scanResults.error) {
      setError(scanResults.error)
      toast({
        title: "Scan Error",
        description: scanResults.error,
        variant: "destructive",
      })
      return
    }

    // Process ports data
    const ports = scanResults.ports || []

    // Calculate summary
    const summary = {
      totalPorts: ports.length,
      openPorts: ports.filter((p) => p.state === "open").length,
      closedPorts: ports.filter((p) => p.state === "closed").length,
      filteredPorts: ports.filter((p) => p.state === "filtered").length,
    }

    const result: NetworkScanResult = {
      hostname: scanDescriptor.hostname,
      timestamp: scanDescriptor.timedate,
      scanType: scanDescriptor.parameters,
      ports,
      summary,
    }

    setResults(result)

    toast({
      title: "Scan Complete",
      description: `Network scan completed for ${scanDescriptor.hostname}`,
    })
  }

  const handleScan = async () => {
    if (!hostname.trim()) {
      setError("Please enter a hostname or IP address")
      return
    }

    if (selectedTechniques.length === 0) {
      setError("Please select at least one scan technique")
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
        await fetch(`${API_BASE_URL}/networkScanner`, { method: "GET" })
      } catch (err) {
        throw new Error(`Cannot connect to Network Scanner API at ${API_BASE_URL}. Make sure the server is running.`)
      }

      // Prepare parameters
      const allParams = [...selectedTechniques, portRange, ...additionalOptions]

      // Start the scan
      const response = await fetch(`${API_BASE_URL}/networkScanner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: hostname.trim(),
          scanType: "nmapscan",
          ...allParams.reduce((acc, param) => ({ ...acc, [param]: true }), {}),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to start network scan")
      }

      setProgress(20)

      // Get the list of running scans to find our scan ID
      const runningScansResponse = await fetch(`${API_BASE_URL}/runningScans`)
      const runningScans = await runningScansResponse.json()

      // Find our scan (most recent one for this hostname)
      const ourScans = runningScans
        .filter((scan: any) => scan.hostname === hostname.trim() && scan.scanname === "nmapscan")
        .sort((a: any, b: any) => new Date(b.timedate).getTime() - new Date(a.timedate).getTime())

      if (ourScans.length > 0) {
        setScanId(ourScans[0].id)
        setProgress(30)
      } else {
        // If we can't find our scan in running scans, check finished scans
        // (it might have completed very quickly)
        const finishedScansResponse = await fetch(`${API_BASE_URL}/finishedScans`)
        const finishedScans = await finishedScansResponse.json()

        const ourFinishedScans = finishedScans
          .filter(
            (scan: any) =>
              scan["scan descriptor"].hostname === hostname.trim() && scan["scan descriptor"].scanname === "nmapscan",
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

    const text = `Network Scan Results for ${results.hostname}
Timestamp: ${new Date(results.timestamp).toLocaleString()}
Scan Type: ${results.scanType.join(", ")}

Summary:
- Total Ports: ${results.summary.totalPorts}
- Open Ports: ${results.summary.openPorts}
- Closed Ports: ${results.summary.closedPorts}
- Filtered Ports: ${results.summary.filteredPorts}

Port Details:
${results.ports
  .map((port) => `${port.port}/${port.proto} - ${port.state}${port.service ? ` (${port.service})` : ""}`)
  .join("\n")}`

    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Network scan results copied to clipboard",
    })
  }

  const downloadResults = () => {
    if (!results) return

    const jsonData = JSON.stringify(results, null, 2)
    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `network-scan-${results.hostname}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download Started",
      description: "Network scan results downloaded",
    })
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "open":
        return "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
      case "closed":
        return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900"
      case "filtered":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-900"
    }
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
            <div className="p-3 bg-green-500 rounded-lg">
              <Network className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Network Scanner</h1>
              <p className="text-slate-600 dark:text-slate-400">Advanced network discovery and port scanning</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Scan Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan Configuration</CardTitle>
                <CardDescription>Configure your network scan parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hostname">Target Host</Label>
                  <Input
                    id="hostname"
                    placeholder="192.168.1.1 or example.com"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    disabled={scanning}
                  />
                  <p className="text-xs text-muted-foreground">Enter an IP address or hostname</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Scan Techniques</Label>
                  <div className="space-y-3">
                    {SCAN_TECHNIQUES.map((technique) => (
                      <div key={technique.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={technique.id}
                          checked={selectedTechniques.includes(technique.id)}
                          onCheckedChange={() => handleTechniqueToggle(technique.id)}
                          disabled={scanning}
                        />
                        <div className="flex-1">
                          <Label htmlFor={technique.id} className="text-sm font-medium cursor-pointer">
                            {technique.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{technique.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Port Range</Label>
                  <RadioGroup value={portRange} onValueChange={setPortRange} disabled={scanning}>
                    {PORT_RANGES.map((range) => (
                      <div key={range.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={range.id} id={range.id} />
                        <div className="flex-1">
                          <Label htmlFor={range.id} className="text-sm font-medium cursor-pointer">
                            {range.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{range.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Additional Options</Label>
                  <div className="space-y-3">
                    {ADDITIONAL_OPTIONS.map((option) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={option.id}
                          checked={additionalOptions.includes(option.id)}
                          onCheckedChange={() => handleOptionToggle(option.id)}
                          disabled={scanning}
                        />
                        <div className="flex-1">
                          <Label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                            {option.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    ))}
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
                  disabled={scanning || !hostname.trim() || selectedTechniques.length === 0}
                  className="w-full"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Start Network Scan
                    </>
                  )}
                </Button>

                {scanning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Scanning ports...</span>
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
              <>
                {/* Summary Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                          Scan Summary
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{results.summary.totalPorts}</div>
                        <div className="text-sm text-muted-foreground">Total Ports</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{results.summary.openPorts}</div>
                        <div className="text-sm text-muted-foreground">Open</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{results.summary.closedPorts}</div>
                        <div className="text-sm text-muted-foreground">Closed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{results.summary.filteredPorts}</div>
                        <div className="text-sm text-muted-foreground">Filtered</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Port Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Port Details</CardTitle>
                    <CardDescription>Detailed information about scanned ports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {results.ports.length > 0 ? (
                          results.ports.map((port, index) => (
                            <div key={index} className={`border rounded-lg p-3 ${getStateColor(port.state)}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="font-mono font-semibold">
                                    {port.port}/{port.proto}
                                  </div>
                                  <Badge variant="outline" className="capitalize">
                                    {port.state}
                                  </Badge>
                                  {port.service && <Badge variant="secondary">{port.service}</Badge>}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {port.state === "open" && <Shield className="h-4 w-4 text-green-600" />}
                                  {port.service && <Server className="h-4 w-4 text-blue-600" />}
                                </div>
                              </div>
                              {port.version && (
                                <div className="mt-2 text-sm text-muted-foreground">Version: {port.version}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No ports found in the specified range
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}

            {!results && !scanning && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Network className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                  <p className="text-muted-foreground text-center">
                    Configure your scan settings and click "Start Network Scan" to begin
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
