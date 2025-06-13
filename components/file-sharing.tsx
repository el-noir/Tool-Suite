"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { nanoid } from "nanoid"
import Peer from "simple-peer"
import { Copy, Download, Link, Loader2, Share2, Users, AlertCircle, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function FileSharing() {
  const [roomId, setRoomId] = useState("")
  const [joinRoomId, setJoinRoomId] = useState("")
  const [peerId] = useState(() => nanoid(10))
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [receivedFile, setReceivedFile] = useState<{ name: string; type: string; data: ArrayBuffer } | null>(null)
  const [progress, setProgress] = useState(0)
  const [transferring, setTransferring] = useState(false)
  const [transferComplete, setTransferComplete] = useState(false)
  const [peerStatus, setPeerStatus] = useState("disconnected")
  const [activeTab, setActiveTab] = useState("send")
  const [connectionSteps, setConnectionSteps] = useState<string[]>([])
  const [debugInfo, setDebugInfo] = useState("")

  const peerRef = useRef<Peer.Instance | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Generate a unique room ID when component mounts
  useEffect(() => {
    setRoomId(nanoid(6).toUpperCase())
  }, [])

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
    setDebugInfo((prev) => prev + `\n${step}`)
  }

  const initializePeer = (initiator: boolean, room: string) => {
    addConnectionStep(`Initializing peer as ${initiator ? "initiator" : "receiver"}`)

    const peer = new Peer({
      initiator,
      trickle: true, // Enable trickle ICE for better connectivity
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
    const maxPolls = 60 // 2 minutes max

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

        addConnectionStep(`Poll ${pollCount}: Found ${data.peers?.length || 0} peers in room`)

        if (data.debug) {
          addConnectionStep(`Debug: Room has ${data.debug.totalPeers} total peers`)
        }

        if (data.peers && data.peers.length > 0) {
          const otherPeer = data.peers[0]
          addConnectionStep(
            `Other peer status: offer=${!!otherPeer.offer}, answer=${!!otherPeer.answer}, candidates=${otherPeer.candidates?.length || 0}`,
          )

          if (initiator) {
            // As initiator, look for answers
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
            // As receiver, look for offers
            if (otherPeer.offer && peerRef.current && !connected) {
              addConnectionStep("Received offer, processing...")
              try {
                peerRef.current.signal(otherPeer.offer)
                addConnectionStep("Offer processed successfully - should send answer now")
              } catch (err) {
                addConnectionStep(`Error processing offer: ${err}`)
              }
            }
          }

          // Process ICE candidates for both sides
          if (otherPeer.candidates && otherPeer.candidates.length > 0) {
            addConnectionStep(`Processing ${otherPeer.candidates.length} ICE candidates`)
            otherPeer.candidates.forEach((candidate, index) => {
              if (peerRef.current) {
                try {
                  peerRef.current.signal(candidate)
                  addConnectionStep(`Processed candidate ${index + 1}`)
                } catch (err) {
                  addConnectionStep(`Error processing candidate ${index + 1}: ${err}`)
                }
              }
            })
          }
        } else {
          if (initiator) {
            addConnectionStep("Waiting for receiver to join...")
          } else {
            addConnectionStep("Looking for sender's offer...")
          }
        }
      } catch (error) {
        addConnectionStep(`Polling error: ${error}`)
        console.error("Polling error:", error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const createRoom = () => {
    setConnecting(true)
    setPeerStatus("connecting")
    setConnectionSteps([])
    setDebugInfo("")
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
    setDebugInfo("")
    addConnectionStep(`Joining room ${formattedRoomId}...`)
    initializePeer(false, formattedRoomId)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      toast({
        title: "File selected",
        description: `${e.target.files[0].name} (${formatFileSize(e.target.files[0].size)})`,
      })
    }
  }

  const handleIncomingData = (data: any) => {
    try {
      const parsedData = JSON.parse(new TextDecoder().decode(data))

      if (parsedData.type === "file-header") {
        // Initialize file reception
        setReceivedFile({
          name: parsedData.name,
          type: parsedData.fileType,
          data: new ArrayBuffer(0),
        })
        setTransferring(true)
        setProgress(0)
        setTransferComplete(false)
        addConnectionStep(`Starting to receive file: ${parsedData.name} (${formatFileSize(parsedData.size)})`)
      } else if (parsedData.type === "file-chunk") {
        setReceivedFile((prevFile) => {
          if (!prevFile) return null

          // Convert the chunk array back to Uint8Array
          const chunkArray = new Uint8Array(parsedData.chunk)

          // Create new buffer with combined size
          const newBuffer = new ArrayBuffer(prevFile.data.byteLength + chunkArray.length)
          const newView = new Uint8Array(newBuffer)

          // Copy existing data
          if (prevFile.data.byteLength > 0) {
            newView.set(new Uint8Array(prevFile.data), 0)
          }

          // Append new chunk
          newView.set(chunkArray, prevFile.data.byteLength)

          const newFile = {
            ...prevFile,
            data: newBuffer,
          }

          // Update progress
          const progressPercent = Math.min(100, (newBuffer.byteLength / parsedData.totalSize) * 100)
          setProgress(progressPercent)

          addConnectionStep(
            `Received chunk: ${newBuffer.byteLength}/${parsedData.totalSize} bytes (${Math.round(progressPercent)}%)`,
          )

          return newFile
        })
      } else if (parsedData.type === "file-complete") {
        setTransferring(false)
        setTransferComplete(true)
        addConnectionStep(`File transfer complete: ${parsedData.name}`)
        toast({
          title: "File received",
          description: `${parsedData.name} has been successfully transferred`,
        })
      }
    } catch (error) {
      addConnectionStep(`Error handling incoming data: ${error}`)
      console.error("Error handling incoming data:", error)
    }
  }

  const sendFile = () => {
    if (!selectedFile || !peerRef.current || !connected) return

    setTransferring(true)
    setProgress(0)
    setTransferComplete(false)
    addConnectionStep(`Starting to send file: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`)

    // Send file header information
    peerRef.current.send(
      JSON.stringify({
        type: "file-header",
        name: selectedFile.name,
        fileType: selectedFile.type,
        size: selectedFile.size,
      }),
    )

    // Read and send the file in chunks
    const CHUNK_SIZE = 16384 // 16KB chunks
    const fileReader = new FileReader()
    let offset = 0
    let chunkCount = 0

    fileReader.onload = (e) => {
      if (e.target?.result && peerRef.current) {
        const chunk = e.target.result as ArrayBuffer
        chunkCount++

        // Convert ArrayBuffer to array of numbers for JSON serialization
        const chunkArray = Array.from(new Uint8Array(chunk))

        // Send the chunk
        peerRef.current.send(
          JSON.stringify({
            type: "file-chunk",
            chunk: chunkArray,
            totalSize: selectedFile.size,
            chunkNumber: chunkCount,
          }),
        )

        // Update progress
        offset += chunk.byteLength
        const progressPercent = Math.min(100, (offset / selectedFile.size) * 100)
        setProgress(progressPercent)

        addConnectionStep(
          `Sent chunk ${chunkCount}: ${offset}/${selectedFile.size} bytes (${Math.round(progressPercent)}%)`,
        )

        // Continue with next chunk or finish
        if (offset < selectedFile.size) {
          readNextChunk()
        } else {
          // Send completion message
          peerRef.current.send(
            JSON.stringify({
              type: "file-complete",
              name: selectedFile.name,
              totalChunks: chunkCount,
            }),
          )
          setTransferring(false)
          setTransferComplete(true)
          addConnectionStep(`File sent successfully: ${chunkCount} chunks`)
          toast({
            title: "File sent",
            description: `${selectedFile.name} has been successfully sent`,
          })
        }
      }
    }

    fileReader.onerror = () => {
      addConnectionStep("Error reading file")
      toast({
        title: "Error reading file",
        description: "There was a problem reading the file",
        variant: "destructive",
      })
      setTransferring(false)
    }

    const readNextChunk = () => {
      const slice = selectedFile.slice(offset, offset + CHUNK_SIZE)
      fileReader.readAsArrayBuffer(slice)
    }

    // Start reading the first chunk
    readNextChunk()
  }

  const downloadFile = () => {
    if (!receivedFile) return

    try {
      addConnectionStep(`Downloading file: ${receivedFile.name} (${formatFileSize(receivedFile.data.byteLength)})`)

      // Create blob with the correct MIME type
      const blob = new Blob([receivedFile.data], {
        type: receivedFile.type || "application/octet-stream",
      })

      // Verify the blob size
      if (blob.size === 0) {
        toast({
          title: "Download Error",
          description: "File appears to be empty. Transfer may have failed.",
          variant: "destructive",
        })
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = receivedFile.name
      document.body.appendChild(a) // Add to DOM for Firefox compatibility
      a.click()
      document.body.removeChild(a) // Clean up
      URL.revokeObjectURL(url)

      addConnectionStep(`File downloaded successfully: ${blob.size} bytes`)
      toast({
        title: "Download Complete",
        description: `${receivedFile.name} has been downloaded`,
      })
    } catch (error) {
      addConnectionStep(`Download error: ${error}`)
      toast({
        title: "Download Error",
        description: "Failed to download the file",
        variant: "destructive",
      })
    }
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    toast({
      title: "Copied to clipboard",
      description: "Room ID has been copied to clipboard",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB"
    else return (bytes / 1073741824).toFixed(1) + " GB"
  }

  const getStatusIndicator = () => {
    switch (peerStatus) {
      case "connected":
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
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
            <AlertCircle className="w-4 h-4 mr-2" />
            Error
          </div>
        )
      default:
        return (
          <div className="flex items-center text-gray-500">
            <div className="w-2 h-2 mr-2 bg-gray-500 rounded-full"></div>
            Disconnected
          </div>
        )
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>P2P File Transfer</CardTitle>
          <div className="text-sm">{getStatusIndicator()}</div>
        </div>
        <CardDescription>Direct browser-to-browser file sharing with NAT traversal</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send Files</TabsTrigger>
            <TabsTrigger value="receive">Receive Files</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="file-upload">Select File to Send</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                disabled={!connected || transferring}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            {!connected && (
              <Button onClick={createRoom} disabled={connecting} className="w-full">
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Waiting for receiver...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Create Room
                  </>
                )}
              </Button>
            )}

            {connected && selectedFile && (
              <Button onClick={sendFile} disabled={transferring || !selectedFile} className="w-full">
                {transferring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Send File
                  </>
                )}
              </Button>
            )}

            {transferring && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Sending {selectedFile?.name}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {transferComplete && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>File sent successfully!</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="receive" className="space-y-4">
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

            {connected && !transferring && !receivedFile && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Connected! Waiting for file transfer...</AlertDescription>
              </Alert>
            )}

            {transferring && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Receiving {receivedFile?.name}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {receivedFile && transferComplete && (
              <div className="p-4 space-y-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{receivedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(receivedFile.data.byteLength)}</p>
                  </div>
                  <Button onClick={downloadFile} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Debug Information */}
        {connecting && connectionSteps.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium mb-2">Connection Status:</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {connectionSteps.map((step, index) => (
                <div key={index} className="text-gray-600">
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <p>End-to-end encrypted</p>
        <p>Works across networks</p>
      </CardFooter>
    </Card>
  )
}
