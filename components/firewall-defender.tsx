"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Game state interface
interface GameState {
  running: boolean
  health: number
  score: number
  packets: Packet[]
  rules: Rule[]
  difficulty: "easy" | "medium" | "hard"
  packetInterval: NodeJS.Timeout | null
  animationInterval: NodeJS.Timeout | null
  packetId: number
}

// Packet interface
interface Packet {
  id: number
  ip: string
  port: number
  protocol: string
  type: "malicious" | "benign"
  x: number
  y: number
  speed: number
  blocked: boolean
  processed?: boolean
}

// Rule interface
interface Rule {
  id: number
  ip: string | null
  port: number | null
  protocol: string | null
  action: "deny" | "allow"
}

// Difficulty settings
const difficulties = {
  easy: { spawnRate: 2000, maliciousChance: 0.3, packetSpeed: 1 },
  medium: { spawnRate: 1500, maliciousChance: 0.5, packetSpeed: 1.5 },
  hard: { spawnRate: 1000, maliciousChance: 0.7, packetSpeed: 2 },
}

// Common network data for realistic simulation
const networkData = {
  ips: [
    "192.168.1.10",
    "192.168.1.20",
    "10.0.0.5",
    "172.16.0.100",
    "203.0.113.25",
    "198.51.100.50",
    "8.8.8.8",
    "1.1.1.1",
    "185.199.108.153",
    "140.82.112.4",
  ],
  ports: [22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 5432, 8080],
  protocols: ["TCP", "UDP", "ICMP"],
  maliciousPatterns: [
    { port: 22, description: "SSH Brute Force" },
    { port: 23, description: "Telnet Attack" },
    { port: 3389, description: "RDP Exploit" },
    { port: 80, description: "HTTP Flood" },
    { port: 443, description: "SSL Attack" },
  ],
}

export default function FirewallDefender() {
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const [gameState, setGameState] = useState<GameState>({
    running: false,
    health: 100,
    score: 0,
    packets: [],
    rules: [
      { id: 1, ip: null, port: 22, protocol: "TCP", action: "deny" },
      { id: 2, ip: "192.168.1.10", port: null, protocol: null, action: "deny" },
    ],
    difficulty: "easy",
    packetInterval: null,
    animationInterval: null,
    packetId: 0,
  })
  const [logs, setLogs] = useState<{ message: string; type: string; time: string }[]>([
    { message: "Firewall Defense System Online", type: "", time: getCurrentTime() },
    { message: "Monitoring network traffic...", type: "", time: getCurrentTime() },
  ])
  const [ruleForm, setRuleForm] = useState({
    ip: "",
    port: "",
    protocol: "",
    action: "deny" as "deny" | "allow",
  })
  const [packetInfo, setPacketInfo] = useState<{ packet: Packet; x: number; y: number } | null>(null)
  const [isGameOver, setIsGameOver] = useState(false)

  // Helper function to get current time
  function getCurrentTime() {
    return new Date().toLocaleTimeString()
  }

  // Log function
  function log(message: string, type = "") {
    setLogs((prev) => [...prev, { message, type, time: getCurrentTime() }])
  }

  // Set difficulty
  function setDifficulty(level: "easy" | "medium" | "hard") {
    setGameState((prev) => ({ ...prev, difficulty: level }))
    log(`Difficulty set to ${level.toUpperCase()}`)
  }

  // Start game
  function startGame() {
    if (gameState.running) return

    setGameState((prev) => ({ ...prev, running: true }))
    log("🚨 Network defense activated!")

    // Start packet generation
    const settings = difficulties[gameState.difficulty]
    const packetInterval = setInterval(generatePacket, settings.spawnRate)
    const animationInterval = setInterval(updatePackets, 50)

    setGameState((prev) => ({
      ...prev,
      running: true,
      packetInterval,
      animationInterval,
    }))
  }

  // Stop game
  function stopGame() {
    if (gameState.packetInterval) clearInterval(gameState.packetInterval)
    if (gameState.animationInterval) clearInterval(gameState.animationInterval)

    setGameState((prev) => ({
      ...prev,
      running: false,
      packetInterval: null,
      animationInterval: null,
    }))

    log("Defense system paused")
  }

  // Reset game
  function resetGame() {
    stopGame()
    setIsGameOver(false)
    setGameState((prev) => ({
      ...prev,
      health: 100,
      score: 0,
      packets: [],
      packetId: 0,
      running: false,
    }))

    // Remove all packet elements
    if (gameAreaRef.current) {
      const packets = gameAreaRef.current.querySelectorAll(".packet")
      packets.forEach((packet) => packet.remove())
    }

    setLogs([
      { message: "Firewall Defense System Online", type: "", time: getCurrentTime() },
      { message: "Monitoring network traffic...", type: "", time: getCurrentTime() },
    ])
    log("System reset - Ready for defense")
  }

  // Generate packet
  function generatePacket() {
    const settings = difficulties[gameState.difficulty]
    const isMalicious = Math.random() < settings.maliciousChance

    const packet: Packet = {
      id: gameState.packetId + 1,
      ip: networkData.ips[Math.floor(Math.random() * networkData.ips.length)],
      port: networkData.ports[Math.floor(Math.random() * networkData.ports.length)],
      protocol: networkData.protocols[Math.floor(Math.random() * networkData.protocols.length)],
      type: isMalicious ? "malicious" : "benign",
      x: -50,
      y: Math.random() * (gameAreaRef.current?.clientHeight || 400 - 200) + 100,
      speed: settings.packetSpeed,
      blocked: false,
    }

    setGameState((prev) => ({
      ...prev,
      packets: [...prev.packets, packet],
      packetId: prev.packetId + 1,
    }))

    createPacketElement(packet)
  }

  // Create packet element
  function createPacketElement(packet: Packet) {
    if (!gameAreaRef.current) return

    const packetEl = document.createElement("div")
    packetEl.className = `packet ${packet.type}`
    packetEl.id = `packet-${packet.id}`
    packetEl.style.left = `${packet.x}px`
    packetEl.style.top = `${packet.y}px`
    packetEl.innerHTML = packet.protocol[0]

    // Add hover events
    packetEl.addEventListener("mouseenter", (e) => {
      const rect = packetEl.getBoundingClientRect()
      setPacketInfo({
        packet,
        x: rect.right + 10,
        y: rect.top - 50,
      })
    })
    packetEl.addEventListener("mouseleave", () => {
      setPacketInfo(null)
    })

    gameAreaRef.current.appendChild(packetEl)
  }

  // Update packets
  function updatePackets() {
    if (!gameAreaRef.current) return

    setGameState((prev) => {
      const updatedPackets = prev.packets.filter((packet) => {
        if (packet.blocked) return false

        const packetEl = document.getElementById(`packet-${packet.id}`)
        if (!packetEl) return false

        // Check if packet should be blocked by rules
        if (!packet.processed) {
          packet.processed = true
          const shouldBlock = checkRules(packet)

          if (shouldBlock) {
            blockPacket(packet)
            return false
          }
        }

        // Update position
        packet.x += packet.speed
        packetEl.style.left = `${packet.x}px`

        // Check if packet reached server
        if (packet.x >= (gameAreaRef.current?.clientWidth || 800) - 150) {
          handlePacketReachedServer(packet)
          packetEl.remove()
          return false
        }

        return true
      })

      return { ...prev, packets: updatedPackets }
    })
  }

  // Check rules
  function checkRules(packet: Packet): boolean {
    for (const rule of gameState.rules) {
      if (matches(rule, packet)) {
        log(
          `Rule matched: ${rule.action.toUpperCase()} ${packet.ip}:${packet.port}/${packet.protocol}`,
          rule.action === "deny" ? "blocked" : "allowed",
        )
        return rule.action === "deny"
      }
    }
    return false // Default allow
  }

  // Check if packet matches rule
  function matches(rule: Rule, packet: Packet): boolean {
    return (
      (!rule.ip || rule.ip === packet.ip) &&
      (!rule.port || rule.port === packet.port) &&
      (!rule.protocol || rule.protocol === packet.protocol)
    )
  }

  // Block packet
  function blockPacket(packet: Packet) {
    const packetEl = document.getElementById(`packet-${packet.id}`)
    if (packetEl) {
      packetEl.classList.add("blocked")
      setTimeout(() => packetEl.remove(), 500)
    }

    if (packet.type === "malicious") {
      setGameState((prev) => ({ ...prev, score: prev.score + 10 }))
      log(`🛡️ Blocked malicious ${packet.protocol} packet from ${packet.ip}:${packet.port}`, "blocked")
    } else {
      setGameState((prev) => ({ ...prev, score: prev.score + 1 }))
      log(`⚠️ Blocked benign ${packet.protocol} packet from ${packet.ip}:${packet.port}`, "blocked")
    }
  }

  // Handle packet reached server
  function handlePacketReachedServer(packet: Packet) {
    if (packet.type === "malicious") {
      setGameState((prev) => {
        const newHealth = prev.health - 10
        const newScore = prev.score - 5

        if (newHealth <= 0) {
          setIsGameOver(true)
        }

        return {
          ...prev,
          health: Math.max(0, newHealth),
          score: newScore,
        }
      })

      log(`💥 BREACH! Malicious ${packet.protocol} packet reached server from ${packet.ip}:${packet.port}`, "malicious")

      // Visual damage effect
      const server = document.getElementById("server")
      if (server) {
        server.classList.add("damaged")
        setTimeout(() => server.classList.remove("damaged"), 300)
      }
    } else {
      setGameState((prev) => ({ ...prev, score: prev.score + 2 }))
      log(`✅ Benign ${packet.protocol} packet processed from ${packet.ip}:${packet.port}`, "allowed")
    }
  }

  // Add rule
  function addRule() {
    const { ip, port, protocol, action } = ruleForm

    if (!ip && !port && !protocol) {
      alert("Please specify at least one rule parameter")
      return
    }

    const rule: Rule = {
      id: Date.now(),
      ip: ip || null,
      port: port ? Number.parseInt(port) : null,
      protocol: protocol || null,
      action,
    }

    setGameState((prev) => ({
      ...prev,
      rules: [...prev.rules, rule],
    }))

    setRuleForm({
      ip: "",
      port: "",
      protocol: "",
      action: "deny",
    })

    log(`New rule added: ${action.toUpperCase()} ${ip || "*"}:${port || "*"}/${protocol || "*"}`)
  }

  // Delete rule
  function deleteRule(ruleId: number) {
    setGameState((prev) => ({
      ...prev,
      rules: prev.rules.filter((rule) => rule.id !== ruleId),
    }))
    log("Rule deleted")
  }

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (gameState.packetInterval) clearInterval(gameState.packetInterval)
      if (gameState.animationInterval) clearInterval(gameState.animationInterval)
    }
  }, [gameState.packetInterval, gameState.animationInterval])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Firewall Defender</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Protect your server from malicious network packets by creating firewall rules.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-lg font-semibold text-center">🛡️ Firewall Control</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Health</div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      gameState.health <= 20
                        ? "text-red-500"
                        : gameState.health <= 50
                          ? "text-amber-500"
                          : "text-green-500",
                    )}
                  >
                    {gameState.health}
                  </div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Score</div>
                  <div className="text-2xl font-bold">{gameState.score}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={gameState.difficulty === "easy" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDifficulty("easy")}
                >
                  Easy
                </Button>
                <Button
                  variant={gameState.difficulty === "medium" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDifficulty("medium")}
                >
                  Medium
                </Button>
                <Button
                  variant={gameState.difficulty === "hard" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setDifficulty("hard")}
                >
                  Hard
                </Button>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={startGame} disabled={gameState.running}>
                  Start Defense
                </Button>
                <Button className="flex-1" onClick={stopGame} disabled={!gameState.running}>
                  Stop
                </Button>
                <Button variant="outline" className="flex-1" onClick={resetGame}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-lg font-semibold">Add Firewall Rule</h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="ruleIP">IP Address (optional)</Label>
                  <Input
                    id="ruleIP"
                    placeholder="192.168.1.10"
                    value={ruleForm.ip}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, ip: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rulePort">Port (optional)</Label>
                  <Input
                    id="rulePort"
                    placeholder="22"
                    type="number"
                    value={ruleForm.port}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, port: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ruleProtocol">Protocol</Label>
                  <select
                    id="ruleProtocol"
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
                    value={ruleForm.protocol}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, protocol: e.target.value }))}
                  >
                    <option value="">Any</option>
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ruleAction">Action</Label>
                  <select
                    id="ruleAction"
                    className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent"
                    value={ruleForm.action}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, action: e.target.value as "deny" | "allow" }))}
                  >
                    <option value="deny">Deny</option>
                    <option value="allow">Allow</option>
                  </select>
                </div>

                <Button className="w-full" onClick={addRule}>
                  Add Rule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-lg font-semibold">Active Rules</h3>

              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {gameState.rules.length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400 italic text-center">No rules configured</div>
                ) : (
                  gameState.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md flex justify-between items-center text-sm border-l-4 border-primary"
                    >
                      <span>
                        {rule.action.toUpperCase()} {rule.ip || "*"}:{rule.port || "*"}/{rule.protocol || "*"}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteRule(rule.id)}
                      >
                        ×
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div
            ref={gameAreaRef}
            className="relative bg-slate-900 border border-slate-700 rounded-lg h-[600px] overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
            }}
          >
            <div
              id="server"
              className="absolute right-[50px] top-1/2 -translate-y-1/2 w-[80px] h-[100px] bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center font-bold text-black shadow-lg z-10"
            >
              SERVER
            </div>

            {isGameOver && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-6">
                <h2 className="text-red-500 text-2xl font-bold mb-4">SYSTEM COMPROMISED!</h2>
                <p className="text-slate-300 mb-2">Your server has been breached.</p>
                <p className="text-slate-300 mb-6">
                  Final Score: <span className="font-bold">{gameState.score}</span>
                </p>
                <Button onClick={resetGame}>Try Again</Button>
              </div>
            )}

            {packetInfo && (
              <div
                className="absolute bg-black/90 text-green-500 p-2 rounded border border-green-500 text-xs z-50"
                style={{
                  left: `${packetInfo.x}px`,
                  top: `${packetInfo.y}px`,
                  maxWidth: "200px",
                }}
              >
                IP: {packetInfo.packet.ip}
                <br />
                Port: {packetInfo.packet.port}
                <br />
                Protocol: {packetInfo.packet.protocol}
                <br />
                Type: {packetInfo.packet.type.toUpperCase()}
              </div>
            )}

            <div className="absolute bottom-4 left-4 w-[300px] bg-black/50 p-3 rounded border border-slate-700 h-[150px] overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "text-xs mb-1",
                    log.type === "blocked" && "text-red-400",
                    log.type === "allowed" && "text-blue-400",
                    log.type === "malicious" && "text-red-300 font-bold",
                  )}
                >
                  [{log.time}] {log.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .packet {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
          transition: all 0.1s linear;
          box-shadow: 0 0 15px currentColor;
          z-index: 10;
        }

        .packet.malicious {
          background: radial-gradient(circle, #ff4444, #cc0000);
          border: 2px solid #ff6666;
        }

        .packet.benign {
          background: radial-gradient(circle, #4444ff, #0000cc);
          border: 2px solid #6666ff;
        }

        .packet.blocked {
          background: radial-gradient(circle, #888, #444);
          border: 2px solid #aaa;
          animation: blockEffect 0.5s ease-out;
        }

        @keyframes blockEffect {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.7; }
          100% { transform: scale(0); opacity: 0; }
        }

        .server.damaged {
          animation: damage 0.3s ease-in-out;
        }

        @keyframes damage {
          0%, 100% { transform: translateY(-50%); }
          25% { transform: translateY(-50%) translateX(-5px); }
          75% { transform: translateY(-50%) translateX(5px); }
        }
      `}</style>
    </div>
  )
}
