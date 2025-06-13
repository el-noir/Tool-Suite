"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Network,
  FileText,
  Wifi,
  Globe,
  Key,
  Search,
  Router,
  Shield,
  ChevronRight,
  ArrowRight,
  Zap,
  Star,
  TrendingUp,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  active: boolean
  route: string
  featured?: boolean
  new?: boolean
  popular?: boolean
}

export default function HomePage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [visibleTools, setVisibleTools] = useState<Tool[]>([])
  const [stats, setStats] = useState({
    totalTools: 0,
    activeTools: 0,
    newTools: 0,
    lastUpdated: new Date().toLocaleDateString(),
  })

  const tools: Tool[] = [
    {
      id: "fileSharing",
      name: "P2P File Sharing",
      description: "Securely share files peer-to-peer with end-to-end encryption",
      icon: FileText,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      active: true,
      route: "/file-sharing",
      featured: true,
      popular: true,
    },
    {
      id: "nmap",
      name: "Network Scanner",
      description: "Scan networks for open ports and services with comprehensive detection",
      icon: Network,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      active: true,
      route: "/nmap",
    },
    {
      id: "dnsFinder",
      name: "DNS Finder",
      description: "Lookup DNS records for any domain including A, AAAA, MX, NS, TXT records",
      icon: Globe,
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      active: true,
      route: "/dns-finder",
    },
    {
      id: "packetSniffer",
      name: "Packet Sniffer",
      description: "Capture and analyze network traffic with real-time protocol analysis",
      icon: Wifi,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      active: false,
      route: "/packet-sniffer",
    },
    {
      id: "sslChecker",
      name: "SSL Certificate Checker",
      description: "Analyze SSL/TLS certificates for security issues and validation",
      icon: Key,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      active: true,
      route: "/ssl-checker",
    },
    {
      id: "subdomainFinder",
      name: "Subdomain Finder",
      description: "Discover and analyze subdomains with SSL information",
      icon: Search,
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      iconColor: "text-teal-600 dark:text-teal-400",
      active: true,
      route: "/subdomain-finder",
      popular: true,
    },
    {
      id: "natSimulator",
      name: "NAT Simulator",
      description: "Simulate and visualize Network Address Translation port forwarding",
      icon: Router,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      active: true,
      route: "/nat-simulator",
    },
    {
      id: "firewallDefender",
      name: "Firewall Defender",
      description: "Interactive game to learn network security by defending against attacks",
      icon: Shield,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      active: true,
      route: "/firewall-defender",
      featured: true,
      new: true,
    },
  ]

  useEffect(() => {
    // Filter tools based on active category and search query
    let filtered = [...tools]

    if (activeCategory === "active") {
      filtered = filtered.filter((tool) => tool.active)
    } else if (activeCategory === "featured") {
      filtered = filtered.filter((tool) => tool.featured)
    } else if (activeCategory === "new") {
      filtered = filtered.filter((tool) => tool.new)
    } else if (activeCategory === "popular") {
      filtered = filtered.filter((tool) => tool.popular)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (tool) => tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query),
      )
    }

    setVisibleTools(filtered)

    // Update stats
    setStats({
      totalTools: tools.length,
      activeTools: tools.filter((tool) => tool.active).length,
      newTools: tools.filter((tool) => tool.new).length,
      lastUpdated: new Date().toLocaleDateString(),
    })
  }, [activeCategory, searchQuery])

  const handleLaunchTool = (route: string) => {
    router.push(route)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary/90 to-primary pt-16 pb-20">
        <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] opacity-20"></div>
        <div className="absolute inset-y-0 right-0 -z-10 w-[40%] bg-gradient-to-l from-primary/0 to-primary/90"></div>

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white backdrop-blur-xl">
                <Badge variant="secondary" className="mr-2 bg-primary-foreground text-primary">
                  New
                </Badge>
                <span>Firewall Defender game now available!</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">Network Toolkit</h1>

              <p className="text-xl text-white/80 max-w-lg">
                A comprehensive suite of network tools for security professionals, developers, and network
                administrators.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={() => document.getElementById("tools-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Explore Tools <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  onClick={() => router.push("/firewall-defender")}
                >
                  Try Firewall Defender <Shield className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-white/80">8 Network Tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-white/80">Interactive Learning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-white/80">Security Focused</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex justify-end">
              <div className="relative w-full max-w-md">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary-foreground to-primary-foreground/50 opacity-30 blur"></div>
                <div className="relative rounded-xl bg-slate-900/90 p-6 shadow-2xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="text-xs text-slate-400">network-toolkit</div>
                    </div>

                    <div className="space-y-2 font-mono text-sm text-green-400">
                      <div>$ network-toolkit --scan 192.168.1.0/24</div>
                      <div className="text-slate-400">Scanning network...</div>
                      <div className="text-slate-400">Found 12 devices</div>
                      <div className="text-slate-400">Analyzing open ports...</div>
                      <div>$ network-toolkit --analyze-ssl example.com</div>
                      <div className="text-slate-400">Certificate valid until: 2024-06-15</div>
                      <div className="text-slate-400">TLS Version: 1.3</div>
                      <div>$ network-toolkit --start-firewall-defender</div>
                      <div className="text-slate-400">Starting Firewall Defender game...</div>
                      <div className="animate-pulse">_</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.totalTools}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Total Tools</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.activeTools}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Active Tools</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.newTools}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">New Tools</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold">1.2k+</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-16" id="tools-section">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Network Security Tools</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
                Explore our comprehensive suite of network security and analysis tools designed for professionals.
              </p>
            </div>

            <div className="mt-4 md:mt-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tools..."
                  className="w-full md:w-64 px-4 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-8">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
            >
              All Tools
            </Button>
            <Button
              variant={activeCategory === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("active")}
            >
              Active
            </Button>
            <Button
              variant={activeCategory === "featured" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("featured")}
            >
              Featured
            </Button>
            <Button
              variant={activeCategory === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("new")}
            >
              New
            </Button>
            <Button
              variant={activeCategory === "popular" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("popular")}
            >
              Popular
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleTools.length > 0 ? (
              visibleTools.map((tool) => (
                <Card
                  key={tool.id}
                  className={cn(
                    "overflow-hidden transition-all duration-300 hover:shadow-lg",
                    tool.featured && "border-primary/50",
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <div className="flex gap-2">
                        {tool.new && <Badge className="bg-blue-500">New</Badge>}
                        {!tool.active && <Badge variant="secondary">Coming Soon</Badge>}
                      </div>
                    </div>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn("p-2 rounded-full", tool.iconBg)}>
                        <tool.icon className={cn("h-5 w-5", tool.iconColor)} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={() => handleLaunchTool(tool.route)} disabled={!tool.active}>
                      Launch Tool
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No tools found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Tool Highlight */}
      <section className="py-16 bg-slate-50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Featured Tool</Badge>
              <h2 className="text-3xl font-bold mb-4">Firewall Defender</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Learn network security concepts through an interactive game. Create firewall rules to block malicious
                packets and protect your server from attacks.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-green-500/20 p-1 mt-1">
                    <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  </div>
                  <span>Create custom firewall rules based on IP, port, and protocol</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-green-500/20 p-1 mt-1">
                    <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  </div>
                  <span>Visualize network packets and their properties</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="rounded-full bg-green-500/20 p-1 mt-1">
                    <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  </div>
                  <span>Multiple difficulty levels for beginners to experts</span>
                </li>
              </ul>
              <Button size="lg" onClick={() => router.push("/firewall-defender")} className="group">
                Try Firewall Defender
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary to-blue-600 opacity-30 blur-xl"></div>
              <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=800')] bg-cover bg-center opacity-50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 backdrop-blur-sm">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-white">Firewall Defender</h3>
                    <p className="mt-2 text-sm text-white/70">Interactive Network Security Game</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Network className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Network Toolkit</span>
              </div>
              <p className="text-slate-400 mb-4 max-w-md">
                A comprehensive suite of network tools for security professionals, developers, and network
                administrators.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tools</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/file-sharing" className="text-slate-400 hover:text-white">
                    P2P File Sharing
                  </a>
                </li>
                <li>
                  <a href="/nmap" className="text-slate-400 hover:text-white">
                    Network Scanner
                  </a>
                </li>
                <li>
                  <a href="/dns-finder" className="text-slate-400 hover:text-white">
                    DNS Finder
                  </a>
                </li>
                <li>
                  <a href="/ssl-checker" className="text-slate-400 hover:text-white">
                    SSL Certificate Checker
                  </a>
                </li>
                <li>
                  <a href="/firewall-defender" className="text-slate-400 hover:text-white">
                    Firewall Defender
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-400 hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white">
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">© {new Date().getFullYear()} Network Toolkit. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">
                Terms of Service
              </a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
