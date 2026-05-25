"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Sparkles,
  Shield,
  Lightbulb,
  ArrowRight,
  Users,
  MessageSquare,
  CheckCircle2,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "多方辩论",
    description: "3 位不同视角的 AI 专家 + 1 位主持人，围绕你的问题展开结构化辩论",
  },
  {
    icon: MessageSquare,
    title: "实时直播",
    description: "旁观整个辩论过程，每位 AI 的观点实时展现，像在看一场专家讨论",
  },
  {
    icon: CheckCircle2,
    title: "共识驱动",
    description: "主持人自动识别共识点，最终给出经过多方审视的可靠结论",
  },
]

const participants = [
  { icon: Brain, name: "AI 主持人", role: "引导讨论，推动共识", color: "text-violet-500" },
  { icon: Lightbulb, name: "创新派专家", role: "前沿视角，突破思维", color: "text-amber-500" },
  { icon: Sparkles, name: "务实派专家", role: "工程可行，最小方案", color: "text-emerald-500" },
  { icon: Shield, name: "安全派专家", role: "安全可靠，长期维护", color: "text-blue-500" },
]

export default function HomePage() {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const handleSubmit = async () => {
    if (!session) {
      router.push("/login")
      return
    }
    if (question.trim().length < 5) return

    setLoading(true)
    const res = await fetch("/api/councils", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim(), rounds: 3 }),
    })
    const data = await res.json()
    setLoading(false)

    if (data.id) {
      router.push(`/council/${data.id}`)
    }
  }

  return (
    <div className="flex-1">
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-12 text-center">
        <Badge variant="secondary" className="mb-4">
          多 AI 协作决策平台
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          让 AI 专家委员会
          <br />
          为你辩论出最佳答案
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-8 max-w-xl mx-auto">
          不再是单一 AI 的一家之言。多位持不同视角的 AI
          专家展开结构化辩论，最终达成共识，给出更可靠的结论。
        </p>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <Textarea
              placeholder="输入你的问题，AI 专家委员会将为你展开辩论...&#10;例如：我们应该用微服务还是单体架构来构建一个 10 人团队的 SaaS 产品？"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px] text-base resize-none border-0 focus-visible:ring-0 p-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {participants.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-1 text-xs text-zinc-400"
                    title={`${p.name}: ${p.role}`}
                  >
                    <p.icon className={`w-3.5 h-3.5 ${p.color}`} />
                  </div>
                ))}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading || question.trim().length < 5}
                size="lg"
              >
                {loading ? (
                  "正在创建委员会..."
                ) : (
                  <>
                    开始辩论
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-24">
        <div className="grid sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <f.icon className="w-8 h-8 text-violet-500 mb-1" />
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-8">工作流程</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "提出你的问题", desc: "任何需要深入思考的问题" },
              { step: "02", title: "AI 委员会展开辩论", desc: "多轮结构化讨论，实时展现" },
              { step: "03", title: "获得共识结论", desc: "经过多方审视的可靠答案" },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-3xl font-bold text-violet-200 dark:text-violet-800 mb-2">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-sm text-zinc-400">
        AI Council - 让 AI 协作更可靠
      </footer>
    </div>
  )
}
