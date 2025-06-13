"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Network, ArrowLeft, Loader2, AlertTriangle, Info, Globe, Server, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface NetworkDevice {
  ip: string
  hostname: string
}

interface NatEntry {
  privateIP: string
  privatePort: number
  publicIP: string
  publicPort: number
  timestamp: string
}

// Mock data for demonstration when API is not available
const generateMockData = () => {
  const privateIP = "192.168.1.100"
  const publicIP = "203.0.113.45"

  const mockDevices: NetworkDevice[] = [
    { ip: "192.168.1.1", hostname: "Router.local" },
    { ip: "192.168.1.100", hostname: "MyComputer.local" },
    { ip: "192.168.1.101", hostname: "Smartphone.local" },
    { ip: "192.168.1.102", hostname: "SmartTV.local" },
    { ip: "192.168.1.103", hostname: "Unknown" },
    { ip: "192.168.1.104", hostname: "Printer.local" },
  ]

  const mockNatTable: NatEntry[] = [
    {
      privateIP: "192.168.1.100",
      privatePort: 8080,
      publicIP: "203.0.113.45",
      publicPort: 32456,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      privateIP: "192.168.1.101",
      privatePort: 3000,
      publicIP: "203.0.113.45",
      publicPort: 54321,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      privateIP: "192.168.1.102",
      privatePort: 443,
      publicIP: "203.0.113.45",
      publicPort: 12345,
      timestamp: new Date().toISOString(),
    },
  ]

  const mockVisitorIPs = ["45.56.78.90", "123.45.67.89", "98.76.54.32"]

  return {
    privateIP,
    publicIP,
    devices: mockDevices,
    natTable: mockNatTable,
    visitorIPs: mockVisitorIPs,
  }
}

export default function NatSimulator() {
  const [privateIP, setPrivateIP] = useState<string | null>(null)
  const [publicIP, setPublicIP] = useState<string | null>(null)
  const [deviceIP, setDeviceIP] = useState("")
  const [devicePort, setDevicePort] = useState("")
  const [devices, setDevices] = useState<NetworkDevice[]>([])
  const [natTable, setNatTable] = useState<NatEntry[]>([])
  const [visitorIPs, setVisitorIPs] = useState<string[]>([])

  const [isLoadingIPs, setIsLoadingIPs] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isAddingDevice, setIsAddingDevice] = useState(false)
  const [usedMockData, setUsedMockData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("network")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { toast } = useToast()

  // Initialize data
  useEffect(() => {
    fetchNetworkInfo()
    fetchNatTable()
    fetchVisitorIPs()
  }, [])

  // Draw visualization when NAT table changes
  useEffect(() => {
    if (natTable.length > 0) {
      drawVisualization()
    }
  }, [natTable])

  const fetchNetworkInfo = async () => {
    setIsLoadingIPs(true)
    setError(null)

    try {
      try {
        // Try to fetch private IP
        const privateResponse = await fetch("http://localhost:3000/api/private-ip", {
          signal: AbortSignal.timeout(5000),
        })

        if (!privateResponse.ok) {
          throw new Error(`Failed to fetch private IP: ${privateResponse.status}`)
        }

        const privateData = await privateResponse.json()
        setPrivateIP(privateData.privateIP)

        // Try to fetch public IP
        const publicResponse = await fetch("http://localhost:3000/api/public-ip", {
          signal: AbortSignal.timeout(5000),
        })

        if (!publicResponse.ok) {
          throw new Error(`Failed to fetch public IP: ${publicResponse.status}`)
        }

        const publicData = await publicResponse.json()
        setPublicIP(publicData.publicIP)

        setUsedMockData(false)
      } catch (fetchError) {
        console.warn("API fetch failed, using mock data:", fetchError)

        // If the API is not available, use mock data
        const mockData = generateMockData()
        setPrivateIP(mockData.privateIP)
        setPublicIP(mockData.publicIP)
        setDevices(mockData.devices)
        setNatTable(mockData.natTable)
        setVisitorIPs(mockData.visitorIPs)
        setUsedMockData(true)
      }
    } catch (err) {
      console.error("Network info error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch network information",
        variant: "destructive",
      })
    } finally {
      setIsLoadingIPs(false)
    }
  }

  const scanNetwork = async () => {
    setIsScanning(true)
    setError(null)

    try {
      if (usedMockData) {
        // If we're already using mock data, just use the mock devices
        const mockData = generateMockData()
        setDevices(mockData.devices)
        toast({
          title: "Network Scan Complete",
          description: `Found ${mockData.devices.length} devices on the network (demo mode)`,
        })
      } else {
        try {
          const response = await fetch("http://localhost:3000/api/scan", {
            signal: AbortSignal.timeout(30000), // Network scan can take longer
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Error: ${response.status}`)
          }

          const data = await response.json()
          setDevices(data)

          toast({
            title: "Network Scan Complete",
            description: `Found ${data.length} devices on the network`,
          })
        } catch (fetchError) {
          console.warn("API fetch failed, using mock data:", fetchError)

          // If the API is not available, use mock data
          const mockData = generateMockData()
          setDevices(mockData.devices)
          setUsedMockData(true)

          toast({
            title: "Network Scan Complete (Demo)",
            description: `Found ${mockData.devices.length} devices on the network (demo mode)`,
          })
        }
      }
    } catch (err) {
      console.error("Network scan error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Scan Failed",
        description: err instanceof Error ? err.message : "Failed to scan network",
        variant: "destructive",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const fetchNatTable = async () => {
    if (usedMockData) return

    try {
      try {
        const response = await fetch("http://localhost:3000/api/nat-table", {
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch NAT table: ${response.status}`)
        }

        const data = await response.json()
        setNatTable(data)
      } catch (fetchError) {
        if (!usedMockData) {
          console.warn("API fetch failed, using mock data:", fetchError)
          const mockData = generateMockData()
          setNatTable(mockData.natTable)
          setUsedMockData(true)
        }
      }
    } catch (err) {
      console.error("NAT table error:", err)
    }
  }

  const fetchVisitorIPs = async () => {
    if (usedMockData) return

    try {
      try {
        const response = await fetch("http://localhost:3000/api/visitors", {
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch visitor IPs: ${response.status}`)
        }

        const data = await response.json()
        setVisitorIPs(data)
      } catch (fetchError) {
        if (!usedMockData) {
          console.warn("API fetch failed, using mock data:", fetchError)
          const mockData = generateMockData()
          setVisitorIPs(mockData.visitorIPs)
          setUsedMockData(true)
        }
      }
    } catch (err) {
      console.error("Visitor IPs error:", err)
    }
  }

  const addDevice = async () => {
    if (!deviceIP || !devicePort) {
      toast({
        title: "Validation Error",
        description: "Please enter both IP address and port",
        variant: "destructive",
      })
      return
    }

    setIsAddingDevice(true)
    setError(null)

    try {
      if (usedMockData) {
        // If we're using mock data, just add to the mock NAT table
        const mockPublicPort = Math.floor(Math.random() * (65535 - 1024) + 1024)
        const newEntry: NatEntry = {
          privateIP: deviceIP,
          privatePort: Number.parseInt(devicePort),
          publicIP: publicIP || "203.0.113.45",
          publicPort: mockPublicPort,
          timestamp: new Date().toISOString(),
        }

        setNatTable((prev) => [...prev, newEntry])
        setDeviceIP("")
        setDevicePort("")

        toast({
          title: "Device Added (Demo)",
          description: `Device mapped to public port ${mockPublicPort} (demo mode)`,
        })
      } else {
        try {
          const response = await fetch("http://localhost:3000/api/device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip: deviceIP, port: devicePort }),
            signal: AbortSignal.timeout(5000),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `Error: ${response.status}`)
          }

          const data = await response.json()
          await fetchNatTable() // Refresh NAT table
          setDeviceIP("")
          setDevicePort("")

          toast({
            title: "Device Added",
            description: `Device mapped to public port ${data.publicPort}`,
          })
        } catch (fetchError) {
          console.warn("API fetch failed, using mock data:", fetchError)

          // If the API is not available, use mock data
          const mockPublicPort = Math.floor(Math.random() * (65535 - 1024) + 1024)
          const newEntry: NatEntry = {
            privateIP: deviceIP,
            privatePort: Number.parseInt(devicePort),
            publicIP: publicIP || "203.0.113.45",
            publicPort: mockPublicPort,
            timestamp: new Date().toISOString(),
          }

          setNatTable((prev) => [...prev, newEntry])
          setDeviceIP("")
          setDevicePort("")
          setUsedMockData(true)

          toast({
            title: "Device Added (Demo)",
            description: `Device mapped to public port ${mockPublicPort} (demo mode)`,
          })
        }
      }
    } catch (err) {
      console.error("Add device error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add device",
        variant: "destructive",
      })
    } finally {
      setIsAddingDevice(false)
    }
  }

  const drawVisualization = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set dark mode aware colors
    const isDarkMode = document.documentElement.classList.contains("dark")
    const textColor = isDarkMode ? "#ffffff" : "#000000"
    const privateNetworkColor = isDarkMode ? "#1e40af" : "#3b82f6" // blue-700 : blue-500
    const publicNetworkColor = isDarkMode ? "#065f46" : "#10b981" // emerald-800 : emerald-500
    const lineColor = isDarkMode ? "#9ca3af" : "#6b7280" // gray-400 : gray-500
    const arrowColor = isDarkMode ? "#f59e0b" : "#d97706" // amber-500 : amber-600

    // Draw private network box
    ctx.fillStyle = privateNetworkColor
    ctx.fillRect(50, 50, 200, 100)
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Private Network", 150, 85)
    ctx.fillText(privateIP || "192.168.1.x", 150, 110)

    // Draw public network box
    ctx.fillStyle = publicNetworkColor
    ctx.fillRect(350, 50, 200, 100)
    ctx.fillStyle = "#ffffff"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Public Internet", 450, 85)
    ctx.fillText(publicIP || "203.0.113.x", 450, 110)

    // Draw NAT device in the middle
    ctx.fillStyle = isDarkMode ? "#475569" : "#94a3b8" // slate-600 : slate-400
    ctx.fillRect(260, 60, 80, 80)
    ctx.fillStyle = "#ffffff"
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText("NAT", 300, 85)
    ctx.fillText("Router", 300, 105)

    // Draw NAT table entries
    natTable.forEach((entry, i) => {
      const y = 200 + i * 40

      // Draw private side
      ctx.fillStyle = textColor
      ctx.font = "12px Arial"
      ctx.textAlign = "right"
      ctx.fillText(`${entry.privateIP}:${entry.privatePort}`, 240, y)

      // Draw arrow
      ctx.beginPath()
      ctx.moveTo(250, y - 5)
      ctx.lineTo(350, y - 5)
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw arrow head
      ctx.beginPath()
      ctx.moveTo(350, y - 5)
      ctx.lineTo(340, y - 10)
      ctx.lineTo(340, y)
      ctx.fillStyle = arrowColor
      ctx.fill()

      // Draw public side
      ctx.fillStyle = textColor
      ctx.font = "12px Arial"
      ctx.textAlign = "left"
      ctx.fillText(`${entry.publicIP}:${entry.publicPort}`, 360, y)
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch (e) {
      return dateString
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
            <div className="p-3 bg-blue-500 rounded-lg">
              <Network className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">NAT Simulator</h1>
              <p className="text-slate-600 dark:text-slate-400">
                Network Address Translation simulation and monitoring
              </p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </div>

        {usedMockData && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>
              The API server is not available. Showing demonstration data for preview purposes.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Network Info & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Information</CardTitle>
                <CardDescription>Your current network details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Private IP</Label>
                    <div className="flex items-center">
                      {isLoadingIPs ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Globe className="h-4 w-4 mr-2 text-blue-500" />
                      )}
                      <span className="font-mono">{privateIP || "Loading..."}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label>Public IP</Label>
                    <div className="flex items-center">
                      {isLoadingIPs ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Server className="h-4 w-4 mr-2 text-green-500" />
                      )}
                      <span className="font-mono">{publicIP || "Loading..."}</span>
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={fetchNetworkInfo} disabled={isLoadingIPs}>
                  {isLoadingIPs ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Network Info
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Device to NAT</CardTitle>
                <CardDescription>Map a private device to a public port</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-ip">Private IP Address</Label>
                  <Input
                    id="device-ip"
                    placeholder="192.168.1.100"
                    value={deviceIP}
                    onChange={(e) => setDeviceIP(e.target.value)}
                    disabled={isAddingDevice}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-port">Private Port</Label>
                  <Input
                    id="device-port"
                    type="number"
                    placeholder="8080"
                    value={devicePort}
                    onChange={(e) => setDevicePort(e.target.value)}
                    disabled={isAddingDevice}
                  />
                </div>

                <Button className="w-full" onClick={addDevice} disabled={isAddingDevice || !deviceIP || !devicePort}>
                  {isAddingDevice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Device to NAT Table"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - NAT Details */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="network">Network Scan</TabsTrigger>
                <TabsTrigger value="nat">NAT Table</TabsTrigger>
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
              </TabsList>

              <TabsContent value="network" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Network Scan Results</CardTitle>
                      <Button variant="outline" size="sm" onClick={scanNetwork} disabled={isScanning}>
                        {isScanning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <Network className="h-4 w-4 mr-2" />
                            Scan Network
                          </>
                        )}
                      </Button>
                    </div>
                    <CardDescription>Devices discovered on your local network</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isScanning ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                        <p className="text-slate-600 dark:text-slate-400">Scanning network for devices...</p>
                      </div>
                    ) : devices.length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {devices.map((device, index) => (
                            <div key={index} className="p-3 border rounded-md flex justify-between items-center">
                              <div>
                                <div className="font-medium">{device.hostname}</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 font-mono">{device.ip}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeviceIP(device.ip)
                                  setDevicePort("8080")
                                }}
                              >
                                Add to NAT
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                        <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No devices found. Click "Scan Network" to discover devices.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nat" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>NAT Table</CardTitle>
                      <Button variant="outline" size="sm" onClick={fetchNatTable}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                    <CardDescription>Current Network Address Translation mappings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                              <th className="py-3 px-4 text-left font-medium">Private IP</th>
                              <th className="py-3 px-4 text-left font-medium">Private Port</th>
                              <th className="py-3 px-4 text-left font-medium">Public IP</th>
                              <th className="py-3 px-4 text-left font-medium">Public Port</th>
                              <th className="py-3 px-4 text-left font-medium">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {natTable.length > 0 ? (
                              natTable.map((entry, index) => (
                                <tr
                                  key={index}
                                  className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                  <td className="py-3 px-4 font-mono">{entry.privateIP}</td>
                                  <td className="py-3 px-4 font-mono">{entry.privatePort}</td>
                                  <td className="py-3 px-4 font-mono">{entry.publicIP}</td>
                                  <td className="py-3 px-4 font-mono">{entry.publicPort}</td>
                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                    {formatDate(entry.timestamp)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-600 dark:text-slate-400">
                                  No NAT entries found. Add a device to create a mapping.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Visitor IPs</h3>
                      {visitorIPs.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {visitorIPs.map((ip, index) => (
                            <Badge key={index} variant="outline" className="font-mono">
                              {ip}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400">No visitor IPs recorded yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="visualization" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>NAT Visualization</CardTitle>
                    <CardDescription>Visual representation of Network Address Translation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md p-4 bg-white dark:bg-slate-900">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={Math.max(300, 180 + natTable.length * 40)}
                        className="w-full h-auto"
                      />
                    </div>

                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-medium">How NAT Works</h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Network Address Translation (NAT) allows multiple devices on a private network to share a single
                        public IP address. When a device sends a request to the internet, the NAT router:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-400">
                        <li>Records the device's private IP and port</li>
                        <li>Assigns a unique public port</li>
                        <li>Replaces the private IP:port with the public IP:port</li>
                        <li>Forwards the modified packet to the internet</li>
                        <li>
                          When responses return, the NAT router uses its table to route data back to the correct private
                          device
                        </li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
