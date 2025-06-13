import { type NextRequest, NextResponse } from "next/server"

// Enhanced room storage with better structure
const rooms = new Map<
  string,
  {
    peers: Map<
      string,
      {
        offer?: any
        answer?: any
        candidates: any[]
        lastSeen: number
      }
    >
  }
>()

// Clean up old rooms every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [roomId, room] of rooms.entries()) {
    for (const [peerId, peer] of room.peers.entries()) {
      if (now - peer.lastSeen > 300000) {
        // 5 minutes
        room.peers.delete(peerId)
      }
    }
    if (room.peers.size === 0) {
      rooms.delete(roomId)
    }
  }
}, 300000)

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  const { searchParams } = new URL(request.url)
  const roomId = params.roomId.toUpperCase() // Ensure consistent case
  const peerId = searchParams.get("peerId")

  if (!peerId) {
    return NextResponse.json({ error: "peerId required" }, { status: 400 })
  }

  if (!rooms.has(roomId)) {
    rooms.set(roomId, { peers: new Map() })
  }

  const room = rooms.get(roomId)!

  // Update last seen for this peer
  if (!room.peers.has(peerId)) {
    room.peers.set(peerId, { candidates: [], lastSeen: Date.now() })
  }
  room.peers.get(peerId)!.lastSeen = Date.now()

  // Get all OTHER peers in the room (not this peer)
  const otherPeers = Array.from(room.peers.entries())
    .filter(([id]) => id !== peerId)
    .map(([id, data]) => ({
      id,
      offer: data.offer,
      answer: data.answer,
      candidates: data.candidates,
      lastSeen: data.lastSeen,
    }))

  // Debug logging
  console.log(`Room ${roomId}: Peer ${peerId} polling. Found ${otherPeers.length} other peers`)
  if (otherPeers.length > 0) {
    console.log(`Other peer data:`, otherPeers[0])
  }

  return NextResponse.json({
    peers: otherPeers,
    roomSize: room.peers.size,
    currentPeer: peerId,
    debug: {
      roomId,
      totalPeers: room.peers.size,
      allPeerIds: Array.from(room.peers.keys()),
    },
  })
}

export async function POST(request: NextRequest, { params }: { params: { roomId: string } }) {
  const { searchParams } = new URL(request.url)
  const roomId = params.roomId.toUpperCase() // Ensure consistent case
  const peerId = searchParams.get("peerId")

  if (!peerId) {
    return NextResponse.json({ error: "peerId required" }, { status: 400 })
  }

  const data = await request.json()

  if (!rooms.has(roomId)) {
    rooms.set(roomId, { peers: new Map() })
  }

  const room = rooms.get(roomId)!

  if (!room.peers.has(peerId)) {
    room.peers.set(peerId, { candidates: [], lastSeen: Date.now() })
  }

  const peer = room.peers.get(peerId)!
  peer.lastSeen = Date.now()

  // Debug logging
  console.log(`Room ${roomId}: Peer ${peerId} sending ${data.type}`)

  if (data.type === "offer") {
    peer.offer = data.signal
    console.log(`Stored offer for peer ${peerId}`)
  } else if (data.type === "answer") {
    peer.answer = data.signal
    console.log(`Stored answer for peer ${peerId}`)
  } else if (data.type === "candidate") {
    peer.candidates.push(data.signal)
    console.log(`Stored candidate for peer ${peerId}, total: ${peer.candidates.length}`)
  }

  return NextResponse.json({
    success: true,
    roomSize: room.peers.size,
    debug: {
      roomId,
      peerId,
      dataType: data.type,
      totalPeers: room.peers.size,
    },
  })
}
