"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, ChevronRight } from "lucide-react"

interface CouncilSummary {
  id: string
  question: string
  status: string
  createdAt: string
  rounds: number
  participants: { id: string; displayName: string; role: string }[]
  _count: { messages: number; consensus: number }
}

export default function HistoryPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [councils, setCouncils] = useState<CouncilSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }

    fetch("/api/councils?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setCouncils(data.councils || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const statusLabel: Record<string, { text: string; variant: "default" | "secondary" | "outline" }> = {
    completed: { text: "已完成", variant: "default" },
    in_progress: { text: "讨论中", variant: "secondary" },
    pending: { text: "等待中", variant: "outline" },
    failed: { text: "失败", variant: "outline" },
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">历史讨论</h1>
        <Badge variant="secondary">{councils.length} 个讨论</Badge>
      </div>

      {councils.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-500 mb-4">还没有任何讨论记录</p>
            <Link
              href="/"
              className="text-violet-500 hover:text-violet-600 font-medium text-sm"
            >
              开始你的第一次 AI 委员会讨论
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {councils.map((c) => {
            const status = statusLabel[c.status] || statusLabel.pending
            return (
              <Link key={c.id} href={`/council/${c.id}`}>
                <Card className="hover:border-violet-300 dark:hover:border-violet-700 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{c.question}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-400">
                        <Badge variant={status.variant} className="text-[10px]">
                          {status.text}
                        </Badge>
                        <span>
                          {new Date(c.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                        <span>{c._count.messages} 条消息</span>
                        <span>{c._count.consensus} 个共识</span>
                        <span>{c.rounds} 轮</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-300 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
