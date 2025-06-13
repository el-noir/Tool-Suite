"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowLeft, Construction } from "lucide-react"
import Link from "next/link"

export default function DNSFinderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
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
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <Construction className="h-16 w-16 mx-auto text-slate-400 mb-4" />
            <CardTitle className="text-2xl">Under Development</CardTitle>
            <CardDescription className="text-lg">Advanced DNS analysis and domain investigation tool</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Planned Features:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    DNS Records Lookup (A, AAAA, MX, etc.)
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Subdomain Enumeration
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    WHOIS Information
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    DNS Propagation Check
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Reverse DNS Lookup
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    DNS Zone Transfer
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Domain History
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                    Bulk Domain Analysis
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
