"use client"

import { useEffect, useState, useRef, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Brain,
  Lightbulb,
  Shield,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface Participant {
  id: string
  displayName: string
  role: string
  modelName?: string
}

interface Message {
  id: string
  content: string
  round: number
  type: string
  participant: Participant
  createdAt: string
}

interface Consensus {
  id: string
  content: string
  agreement: number
  round: number
}

interface CouncilData {
  id: string
  question: string
  status: string
  rounds: number
  participants: Participant[]
  messages: Message[]
  consensus: Consensus[]
}

function getRoleIcon(displayName: string) {
  if (displayName.includes("主持人")) return Brain
  if (displayName.includes("创新")) return Lightbulb
  if (displayName.includes("务实")) return Sparkles
  if (displayName.includes("安全")) return Shield
  return Brain
}

function getRoleColor(displayName: string) {
  if (displayName.includes("主持人")) return "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300"
  if (displayName.includes("创新")) return "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
  if (displayName.includes("务实")) return "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
  if (displayName.includes("安全")) return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
  return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
}

export default function CouncilPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [council, setCouncil] = useState<CouncilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamConnected, setStreamConnected] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }

    fetchCouncil()
  }, [id, session])

  useEffect(() => {
    if (!council || council.status !== "in_progress") return

    const es = new EventSource(`/api/councils/${id}/stream`)

    es.addEventListener("message", (event) => {
      const parsed = JSON.parse(event.data)

      if (parsed.type === "message") {
        setCouncil((prev) => {
          if (!prev) return prev
          const exists = prev.messages.find((m) => m.id === parsed.data.id)
          if (exists) return prev
          return {
            ...prev,
            messages: [...prev.messages, parsed.data as Message],
          }
        })
      } else if (parsed.type === "consensus") {
        setCouncil((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            consensus: [...prev.consensus, parsed.data as Consensus],
          }
        })
      } else if (parsed.type === "status") {
        setCouncil((prev) => {
          if (!prev) return prev
          return { ...prev, status: parsed.data.status }
        })
      } else if (parsed.type === "error") {
        setErrorMsg(parsed.data.message as string)
      }
    })

    es.addEventListener("open", () => setStreamConnected(true))
    es.addEventListener("error", () => {
      setStreamConnected(false)
      es.close()
    })

    return () => {
      es.close()
    }
  }, [council?.status, id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [council?.messages])

  const fetchCouncil = async () => {
    const res = await fetch(`/api/councils/${id}`)
    if (res.ok) {
      const data = await res.json()
      setCouncil(data.council)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!council) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500">未找到该讨论</p>
      </div>
    )
  }

  const roundLabels: Record<number, string> = {
    1: "开场陈述",
    2: "交叉辩论",
    3: "共识与结论",
  }

  const messagesByRound = council.messages.reduce(
    (acc, msg) => {
      const round = msg.round
      if (!acc[round]) acc[round] = []
      acc[round].push(msg)
      return acc
    },
    {} as Record<number, Message[]>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 w-full flex flex-col flex-1">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant={
              council.status === "completed"
                ? "default"
                : council.status === "in_progress"
                ? "secondary"
                : "outline"
            }
          >
            {council.status === "completed"
              ? "已完成"
              : council.status === "in_progress"
              ? "讨论中"
              : council.status === "pending"
              ? "等待中"
              : "失败"}
          </Badge>
          {council.status === "in_progress" && (
            <Badge variant="outline" className="gap-1">
              <span
                className={`w-2 h-2 rounded-full ${streamConnected ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {streamConnected ? "实时连接" : "连接中"}
            </Badge>
          )}
        </div>
        <h1 className="text-xl font-bold">{council.question}</h1>
        <div className="flex gap-2 mt-2">
          {council.participants.map((p) => {
            const Icon = getRoleIcon(p.displayName)
            return (
              <Badge
                key={p.id}
                variant="outline"
                className={`gap-1 ${getRoleColor(p.displayName)}`}
              >
                <Icon className="w-3 h-3" />
                {p.displayName}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Error display */}
      {(errorMsg || council.status === "failed") && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorMsg || "辩论过程中出现错误。请确认已配置有效的 LLM API 密钥（OPENAI_API_KEY 和 ANTHROPIC_API_KEY）。"}
          </p>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-6 pb-8">
          {Object.entries(messagesByRound).map(([round, msgs]) => (
            <div key={round}>
              <div className="flex items-center gap-2 mb-3">
                <Separator className="flex-1" />
                <Badge variant="secondary" className="shrink-0">
                  第 {round} 轮 ·{" "}
                  {roundLabels[parseInt(round)] || `讨论轮次`}
                </Badge>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-3">
                {msgs.map((msg) => {
                  const Icon = getRoleIcon(msg.participant.displayName)
                  const isModerator = msg.participant.role === "moderator"

                  return (
                    <Card
                      key={msg.id}
                      className={`border-zinc-200 dark:border-zinc-800 ${
                        isModerator
                          ? "border-l-violet-400 border-l-4"
                          : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback
                              className={`text-xs ${getRoleColor(msg.participant.displayName)}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <CardTitle className="text-sm font-medium">
                            {msg.participant.displayName}
                          </CardTitle>
                          {msg.type === "system" && (
                            <Badge variant="secondary" className="text-[10px]">
                              主持人
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Consensus for this round */}
              {council.consensus
                .filter((c) => c.round === parseInt(round))
                .map((c) => (
                  <Card
                    key={c.id}
                    className="mt-3 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          共识点 (认同度: {Math.round(c.agreement)}%)
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        {c.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ))}

          {council.status === "in_progress" && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              等待更多讨论内容...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
