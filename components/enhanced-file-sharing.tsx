"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { nanoid } from "nanoid"
import Peer from "simple-peer"
import {
  Copy,
  Download,
  LinkIcon,
  Loader2,
  Share2,
  Users,
  ArrowLeft,
  Upload,
  MessageCircle,
  Send,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  File,
  Settings,
  Monitor,
  Wifi,
  WifiOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import NextLink from "next/link"

interface FileTransfer {
  id: string
  name: string
  size: number
  type: string
  status: "pending" | "transferring" | "completed" | "paused" | "failed"
  progress: number
  speed: number
  timeRemaining: number
  data?: ArrayBuffer
  direction: "sending" | "receiving"
  startTime: number
}

interface ChatMessage {
  id: string
  message: string
  timestamp: number
  sender: "me" | "peer" | "system"
}

export default function EnhancedFileSharing() {
  const [roomId, setRoomId] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [peerId] = useState(() => nanoid(10))
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [peerStatus, setPeerStatus] = useState("disconnected")
  const [activeTab, setActiveTab] = useState("transfer")
  const [connectionSteps, setConnectionSteps] = useState<string[]>([])

  // File transfer state
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")

  // Settings
  const [autoAcceptFiles, setAutoAcceptFiles] = useState(false)
  const [compressionEnabled, setCompressionEnabled] = useState(true)
  const [showNotifications, setShowNotifications] = useState(true)

  // Statistics
  const [connectionStats, setConnectionStats] = useState({
    bytesTransferred: 0,
    transferSpeed: 0,
    connectionQuality: "good" as "excellent" | "good" | "fair" | "poor",
    uptime: 0,
  })

  const peerRef = useRef<Peer.Instance | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Generate a unique room ID when component mounts
  useEffect(() => {
    setRoomId(nanoid(6).toUpperCase())
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      if (peerRef.current) {
        peerRef.current.destroy()
      }
    }
  }, [])

  const addConnectionStep = (step: string) => {
    setConnectionSteps((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${step}`])
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon
    if (type.startsWith("video/")) return Video
    if (type.startsWith("audio/")) return Music
    if (type.startsWith("text/")) return FileText
    if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return Archive
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${Math.round(bytesPerSecond)} B/s`
    else if (bytesPerSecond < 1048576) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
    else return `${(bytesPerSecond / 1048576).toFixed(1)} MB/s`
  }

  const initializePeer = (initiator: boolean, room: string) => {
    addConnectionStep(`Initializing peer as ${initiator ? "initiator" : "receiver"}`)

    const peer = new Peer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun.relay.metered.ca:80" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
        iceCandidatePoolSize: 10,
      },
    })

    peer.on("signal", async (data) => {
      addConnectionStep(`Sending ${data.type || "signal"} data`)
      try {
        const signalType = data.type === "offer" ? "offer" : data.type === "answer" ? "answer" : "candidate"

        await fetch(`/api/rooms/${room}?peerId=${peerId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: signalType,
            signal: data,
          }),
        })
        addConnectionStep(`${signalType} sent successfully`)
      } catch (error) {
        addConnectionStep(`Error sending signal: ${error}`)
        console.error("Error sending signal:", error)
      }
    })

    peer.on("connect", () => {
      addConnectionStep("Peer connection established!")
      setConnecting(false)
      setConnected(true)
      setPeerStatus("connected")
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }

      // Send initial chat message
      sendChatMessage("Connected! Ready to share files.", "system")

      toast({
        title: "Connected!",
        description: "Peer connection established successfully",
      })
    })

    peer.on("data", handleIncomingData)

    peer.on("error", (err) => {
      addConnectionStep(`Peer error: ${err.message}`)
      console.error("Peer connection error:", err)
      setPeerStatus("error")
      setConnecting(false)
      toast({
        title: "Connection error",
        description: `Failed to establish connection: ${err.message}`,
        variant: "destructive",
      })
    })

    peer.on("close", () => {
      addConnectionStep("Peer connection closed")
      setPeerStatus("disconnected")
      setConnected(false)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      toast({
        title: "Connection closed",
        description: "The peer connection has been closed",
      })
    })

    peerRef.current = peer
    startPolling(room, initiator)
  }

  const startPolling = (room: string, initiator: boolean) => {
    addConnectionStep("Starting signaling polling")

    let pollCount = 0
    const maxPolls = 60

    pollingRef.current = setInterval(async () => {
      pollCount++

      if (pollCount > maxPolls) {
        addConnectionStep("Polling timeout - stopping")
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
        }
        return
      }

      try {
        const response = await fetch(`/api/rooms/${room.toUpperCase()}?peerId=${peerId}`)
        const data = await response.json()

        if (data.peers && data.peers.length > 0) {
          const otherPeer = data.peers[0]

          if (initiator) {
            if (otherPeer.answer && peerRef.current && !connected) {
              addConnectionStep("Received answer, processing...")
              try {
                peerRef.current.signal(otherPeer.answer)
                addConnectionStep("Answer processed successfully")
              } catch (err) {
                addConnectionStep(`Error processing answer: ${err}`)
              }
            }
          } else {
            if (otherPeer.offer && peerRef.current && !connected) {
              addConnectionStep("Received offer, processing...")
              try {
                peerRef.current.signal(otherPeer.offer)
                addConnectionStep("Offer processed successfully")
              } catch (err) {
                addConnectionStep(`Error processing offer: ${err}`)
              }
            }
          }

          if (otherPeer.candidates && otherPeer.candidates.length > 0) {
            otherPeer.candidates.forEach((candidate, index) => {
              if (peerRef.current) {
                try {
                  peerRef.current.signal(candidate)
                } catch (err) {
                  console.error(`Error processing candidate ${index + 1}:`, err)
                }
              }
            })
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, 2000)
  }

  const handleIncomingData = (data: any) => {
    try {
      const parsedData = JSON.parse(new TextDecoder().decode(data))

      if (parsedData.type === "chat-message") {
        setChatMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            message: parsedData.message,
            timestamp: Date.now(),
            sender: "peer",
          },
        ])
      } else if (parsedData.type === "file-header") {
        const newTransfer: FileTransfer = {
          id: nanoid(),
          name: parsedData.name,
          size: parsedData.size,
          type: parsedData.fileType,
          status: "transferring",
          progress: 0,
          speed: 0,
          timeRemaining: 0,
          direction: "receiving",
          startTime: Date.now(),
          data: new ArrayBuffer(0),
        }

        setFileTransfers((prev) => [...prev, newTransfer])
        addConnectionStep(`Starting to receive: ${parsedData.name}`)
      } else if (parsedData.type === "file-chunk") {
        setFileTransfers((prev) =>
          prev.map((transfer) => {
            if (transfer.direction === "receiving" && transfer.status === "transferring") {
              const chunkArray = new Uint8Array(parsedData.chunk)
              const newBuffer = new ArrayBuffer((transfer.data?.byteLength || 0) + chunkArray.length)
              const newView = new Uint8Array(newBuffer)

              if (transfer.data && transfer.data.byteLength > 0) {
                newView.set(new Uint8Array(transfer.data), 0)
              }
              newView.set(chunkArray, transfer.data?.byteLength || 0)

              const progress = Math.min(100, (newBuffer.byteLength / parsedData.totalSize) * 100)
              const elapsed = (Date.now() - transfer.startTime) / 1000
              const speed = newBuffer.byteLength / elapsed
              const remaining = (parsedData.totalSize - newBuffer.byteLength) / speed

              return {
                ...transfer,
                data: newBuffer,
                progress,
                speed,
                timeRemaining: remaining,
              }
            }
            return transfer
          }),
        )
      } else if (parsedData.type === "file-complete") {
        setFileTransfers((prev) =>
          prev.map((transfer) => {
            if (transfer.direction === "receiving" && transfer.name === parsedData.name) {
              return { ...transfer, status: "completed", progress: 100 }
            }
            return transfer
          }),
        )

        toast({
          title: "File received",
          description: `${parsedData.name} has been successfully received`,
        })
      }
    } catch (error) {
      console.error("Error handling incoming data:", error)
    }
  }

  const sendChatMessage = (message: string, sender: "me" | "peer" | "system" = "me") => {
    if (sender !== "system") {
      setChatMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          message,
          timestamp: Date.now(),
          sender,
        },
      ])
    }

    if (peerRef.current && connected && sender === "me") {
      peerRef.current.send(
        JSON.stringify({
          type: "chat-message",
          message,
        }),
      )
    }
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && connected) {
      sendChatMessage(newMessage.trim())
      setNewMessage("")
    }
  }

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files)
      toast({
        title: "Files selected",
        description: `${e.target.files.length} file(s) ready to send`,
      })
    }
  }

  const sendFiles = () => {
    if (!selectedFiles || !peerRef.current || !connected) return

    Array.from(selectedFiles).forEach((file) => {
      const transferId = nanoid()
      const newTransfer: FileTransfer = {
        id: transferId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "transferring",
        progress: 0,
        speed: 0,
        timeRemaining: 0,
        direction: "sending",
        startTime: Date.now(),
      }

      setFileTransfers((prev) => [...prev, newTransfer])
      sendSingleFile(file, transferId)
    })

    setSelectedFiles(null)
  }

  const sendSingleFile = (file: File, transferId: string) => {
    if (!peerRef.current) return

    // Send file header
    peerRef.current.send(
      JSON.stringify({
        type: "file-header",
        name: file.name,
        fileType: file.type,
        size: file.size,
      }),
    )

    const CHUNK_SIZE = 16384
    const fileReader = new FileReader()
    let offset = 0
    const startTime = Date.now()

    fileReader.onload = (e) => {
      if (e.target?.result && peerRef.current) {
        const chunk = e.target.result as ArrayBuffer
        const chunkArray = Array.from(new Uint8Array(chunk))

        peerRef.current.send(
          JSON.stringify({
            type: "file-chunk",
            chunk: chunkArray,
            totalSize: file.size,
          }),
        )

        offset += chunk.byteLength
        const progress = Math.min(100, (offset / file.size) * 100)
        const elapsed = (Date.now() - startTime) / 1000
        const speed = offset / elapsed
        const remaining = (file.size - offset) / speed

        setFileTransfers((prev) =>
          prev.map((transfer) =>
            transfer.id === transferId ? { ...transfer, progress, speed, timeRemaining: remaining } : transfer,
          ),
        )

        if (offset < file.size) {
          readNextChunk()
        } else {
          peerRef.current.send(
            JSON.stringify({
              type: "file-complete",
              name: file.name,
            }),
          )

          setFileTransfers((prev) =>
            prev.map((transfer) =>
              transfer.id === transferId ? { ...transfer, status: "completed", progress: 100 } : transfer,
            ),
          )
        }
      }
    }

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE)
      fileReader.readAsArrayBuffer(slice)
    }

    readNextChunk()
  }

  const downloadFile = (transfer: FileTransfer) => {
    if (!transfer.data) return

    try {
      const blob = new Blob([transfer.data], { type: transfer.type || "application/octet-stream" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = transfer.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Download Complete",
        description: `${transfer.name} has been downloaded`,
      })
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Failed to download the file",
        variant: "destructive",
      })
    }
  }

  const createRoom = () => {
    setConnecting(true)
    setPeerStatus("connecting")
    setConnectionSteps([])
    addConnectionStep("Creating room and waiting for peer...")
    initializePeer(true, roomId)
  }

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      toast({
        title: "Room ID required",
        description: "Please enter a room ID to join",
        variant: "destructive",
      })
      return
    }

    const formattedRoomId = joinRoomId.toUpperCase().trim()
    setConnecting(true)
    setPeerStatus("connecting")
    setConnectionSteps([])
    addConnectionStep(`Joining room ${formattedRoomId}...`)
    initializePeer(false, formattedRoomId)
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    toast({
      title: "Copied to clipboard",
      description: "Room ID has been copied to clipboard",
    })
  }

  const getStatusIndicator = () => {
    switch (peerStatus) {
      case "connected":
        return (
          <div className="flex items-center text-green-600">
            <Wifi className="w-4 h-4 mr-2" />
            Connected
          </div>
        )
      case "connecting":
        return (
          <div className="flex items-center text-yellow-600">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting
          </div>
        )
      case "error":
        return (
          <div className="flex items-center text-red-600">
            <WifiOff className="w-4 h-4 mr-2" />
            Error
          </div>
        )
      default:
        return (
          <div className="flex items-center text-gray-500">
            <WifiOff className="w-4 h-4 mr-2" />
            Disconnected
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <NextLink href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </NextLink>
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Share2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Enhanced P2P File Sharing</h1>
                <p className="text-slate-600 dark:text-slate-400">Complete peer-to-peer file sharing solution</p>
              </div>
            </div>
            <div className="text-sm">{getStatusIndicator()}</div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Connection & Transfer */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection</CardTitle>
                <CardDescription>Establish peer-to-peer connection</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">Create Room</TabsTrigger>
                    <TabsTrigger value="join">Join Room</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="room-id">Room ID</Label>
                      <div className="flex gap-2">
                        <Input id="room-id" value={roomId} readOnly className="font-mono text-lg font-bold" />
                        <Button variant="outline" onClick={copyRoomId} size="icon">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Share this Room ID with the receiver</p>
                    </div>

                    {!connected && (
                      <Button onClick={createRoom} disabled={connecting} className="w-full">
                        {connecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Waiting for peer...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Create Room
                          </>
                        )}
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="join" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="join-room-id">Enter Room ID</Label>
                      <Input
                        id="join-room-id"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        placeholder="Enter room ID"
                        disabled={connecting || connected}
                        className="font-mono text-lg"
                      />
                    </div>

                    {!connected && (
                      <Button onClick={joinRoom} disabled={connecting || !joinRoomId.trim()} className="w-full">
                        {connecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Join Room
                          </>
                        )}
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* File Transfer Section */}
            {connected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    File Transfer
                    <Badge variant="outline">{fileTransfers.length} transfers</Badge>
                  </CardTitle>
                  <CardDescription>Send and receive files securely</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Select Files to Send</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelection}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {selectedFiles && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{selectedFiles.length} file(s) selected</p>
                        <Button onClick={sendFiles} size="sm">
                          <Upload className="w-4 h-4 mr-2" />
                          Send Files
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Active Transfers */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Active Transfers</h4>
                    <ScrollArea className="h-64">
                      {fileTransfers.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No active transfers</div>
                      ) : (
                        <div className="space-y-3">
                          {fileTransfers.map((transfer) => {
                            const IconComponent = getFileIcon(transfer.type)
                            return (
                              <div key={transfer.id} className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <IconComponent className="w-4 h-4" />
                                    <span className="font-medium text-sm">{transfer.name}</span>
                                    <Badge variant={transfer.direction === "sending" ? "default" : "secondary"}>
                                      {transfer.direction}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {transfer.status === "completed" && transfer.direction === "receiving" && (
                                      <Button size="sm" variant="outline" onClick={() => downloadFile(transfer)}>
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    )}
                                    <Badge
                                      variant={
                                        transfer.status === "completed"
                                          ? "default"
                                          : transfer.status === "failed"
                                            ? "destructive"
                                            : "secondary"
                                      }
                                    >
                                      {transfer.status}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{formatFileSize(transfer.size)}</span>
                                    <span>{Math.round(transfer.progress)}%</span>
                                  </div>
                                  <Progress value={transfer.progress} className="h-1" />
                                  {transfer.status === "transferring" && (
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>{formatSpeed(transfer.speed)}</span>
                                      <span>{formatTime(transfer.timeRemaining)} remaining</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Chat & Stats */}
          <div className="space-y-6">
            {/* Chat */}
            {connected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-64 p-4" ref={chatScrollRef}>
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">No messages yet</div>
                    ) : (
                      <div className="space-y-2">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-2 rounded-lg max-w-[80%] ${
                              message.sender === "me"
                                ? "bg-blue-500 text-white ml-auto"
                                : "bg-slate-100 dark:bg-slate-800"
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-4 border-t">
                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connection Stats */}
            {connected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Monitor className="w-4 h-4 mr-2" />
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Data Transferred</div>
                      <div className="font-medium">{formatFileSize(connectionStats.bytesTransferred)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Speed</div>
                      <div className="font-medium">{formatSpeed(connectionStats.transferSpeed)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Quality</div>
                      <div className="font-medium capitalize">{connectionStats.connectionQuality}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Uptime</div>
                      <div className="font-medium">{formatTime(connectionStats.uptime)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-accept">Auto-accept files</Label>
                  <Switch id="auto-accept" checked={autoAcceptFiles} onCheckedChange={setAutoAcceptFiles} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="compression">Enable compression</Label>
                  <Switch id="compression" checked={compressionEnabled} onCheckedChange={setCompressionEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications">Show notifications</Label>
                  <Switch id="notifications" checked={showNotifications} onCheckedChange={setShowNotifications} />
                </div>
              </CardContent>
            </Card>

            {/* Debug Info */}
            {connecting && connectionSteps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Connection Debug</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="text-xs space-y-1">
                      {connectionSteps.map((step, index) => (
                        <div key={index} className="text-muted-foreground">
                          {step}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
