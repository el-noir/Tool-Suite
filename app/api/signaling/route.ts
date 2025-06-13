import type { NextRequest } from "next/server"

// In-memory storage for active connections
const rooms = new Map<string, Set<any>>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room")

  if (!room) {
    return new Response("Room parameter is required", { status: 400 })
  }

  // For development, we'll use Server-Sent Events instead of WebSockets
  // This is more compatible with Next.js development environment

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Store this connection
      if (!rooms.has(room)) {
        rooms.set(room, new Set())
      }

      const roomConnections = rooms.get(room)!
      const connection = {
        controller,
        room,
        send: (data: any) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch (error) {
            console.error("Error sending message:", error)
          }
        },
      }

      roomConnections.add(connection)

      // Notify other connections in the room
      roomConnections.forEach((conn) => {
        if (conn !== connection) {
          conn.send({ type: "user-joined" })
        }
      })

      // Send initial connection message
      connection.send({ type: "connected", room })

      // Handle cleanup when connection closes
      request.signal.addEventListener("abort", () => {
        roomConnections.delete(connection)
        if (roomConnections.size === 0) {
          rooms.delete(room)
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get("room")

  if (!room) {
    return new Response("Room parameter is required", { status: 400 })
  }

  try {
    const data = await request.json()
    const roomConnections = rooms.get(room)

    if (roomConnections) {
      // Broadcast message to all connections in the room except sender
      roomConnections.forEach((connection) => {
        connection.send(data)
      })
    }

    return new Response("Message sent", { status: 200 })
  } catch (error) {
    console.error("Error processing POST request:", error)
    return new Response("Error processing request", { status: 500 })
  }
}
