import { db } from "@/lib/db"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { EventEmitter } from "events"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

type CouncilEventType = "message" | "consensus" | "status" | "error" | "complete"

interface CouncilEvent {
  type: CouncilEventType
  data: Record<string, unknown>
}

const councilEmitters = new Map<string, EventEmitter>()

export function getCouncilEmitter(councilId: string): EventEmitter {
  if (!councilEmitters.has(councilId)) {
    councilEmitters.set(councilId, new EventEmitter())
  }
  return councilEmitters.get(councilId)!
}

export function removeCouncilEmitter(councilId: string) {
  councilEmitters.delete(councilId)
}

function emit(councilId: string, event: CouncilEvent) {
  const emitter = councilEmitters.get(councilId)
  if (emitter) {
    emitter.emit("event", event)
  }
}

function getModel(provider: string, modelName: string) {
  if (provider === "openai") return openai(modelName)
  if (provider === "anthropic") return anthropic(modelName)
  throw new Error(`Unknown provider: ${provider}`)
}

interface ParticipantDef {
  displayName: string
  provider: string
  modelName: string
  role: "moderator" | "participant"
  systemPrompt: string
}

const DEFAULT_MODERATOR_PROMPT = `你是一个 AI 委员会的会议主持人（Moderator）。你的职责是：

1. **开场**：清晰陈述待讨论的问题，确保所有参与者理解议题
2. **引导讨论**：给每位参与者发言机会，确保讨论有序进行
3. **汇总观点**：识别各方观点的共同点和分歧点
4. **推动共识**：当有足够讨论后，引导参与者达成共识
5. **总结结论**：最终给出清晰、可操作的结论

你的回复风格应该：
- 简洁专业，控制长度
- 用中文回答（与用户问题语言一致）
- 不要重复已讨论过的内容
- 每次发言聚焦于推动讨论前进`

const DEFAULT_PARTICIPANT_PROMPT = `你是一个 AI 专家委员会成员。你的职责是：

1. **深入分析**：从你的专业角度深入分析问题
2. **独立思考**：提出独特的、有见地的观点
3. **建设性批评**：对他人的观点提出建设性的质疑或补充
4. **承认局限**：如果不确定，坦诚说明

你的回复风格应该：
- 简洁有力，控制在3-5段
- 用中文回答
- 引用其他参与者的观点时要准确
- 明确表达同意或反对，并给出理由`

export async function createCouncil(
  question: string,
  userId: string,
  rounds: number = 3,
  customParticipants?: Omit<ParticipantDef, "role">[]
) {
  const council = await db.council.create({
    data: {
      question,
      userId,
      rounds,
      status: "pending",
    },
  })

  const participants: ParticipantDef[] = customParticipants?.length
    ? [
        {
          displayName: "AI 主持人",
          provider: "openai",
          modelName: "gpt-4o",
          role: "moderator",
          systemPrompt: DEFAULT_MODERATOR_PROMPT,
        },
        ...customParticipants.map((p) => ({ ...p, role: "participant" as const })),
      ]
    : getDefaultParticipants()

  for (const p of participants) {
    await db.councilParticipant.create({
      data: {
        councilId: council.id,
        modelName: `${p.provider}/${p.modelName}`,
        role: p.role,
        systemPrompt: p.systemPrompt,
        displayName: p.displayName,
      },
    })
  }

  return council
}

function getDefaultParticipants(): ParticipantDef[] {
  return [
    {
      displayName: "AI 主持人",
      provider: "openai",
      modelName: "gpt-4o",
      role: "moderator",
      systemPrompt: DEFAULT_MODERATOR_PROMPT,
    },
    {
      displayName: "务实派专家",
      provider: "openai",
      modelName: "gpt-4o",
      role: "participant",
      systemPrompt: `${DEFAULT_PARTICIPANT_PROMPT}
你的专业视角是「务实工程」。你关注：
- 实施的可行性和成本
- 实际工程中的限制和权衡
- 最短路径和最小可行方案
- 避免过度工程化
你会质疑过于理论化或复杂度高的方案。`,
    },
    {
      displayName: "创新派专家",
      provider: "anthropic",
      modelName: "claude-sonnet-4-6",
      role: "participant",
      systemPrompt: `${DEFAULT_PARTICIPANT_PROMPT}
你的专业视角是「创新突破」。你关注：
- 前沿技术和创新方法
- 突破传统思维框架的解决方案
- 长远的技术趋势和可能性
- 用户体验和设计思维
你会质疑过于保守或陈旧的方案。`,
    },
    {
      displayName: "安全派专家",
      provider: "anthropic",
      modelName: "claude-sonnet-4-6",
      role: "participant",
      systemPrompt: `${DEFAULT_PARTICIPANT_PROMPT}
你的专业视角是「安全与可靠性」。你关注：
- 系统的安全性和数据保护
- 边缘情况和异常处理
- 长期可维护性和代码质量
- 合规性和行业最佳实践
你会质疑存在安全隐患或技术债务风险的方案。`,
    },
  ]
}

export async function runCouncilDebate(councilId: string) {
  const council = await db.council.findUnique({
    where: { id: councilId },
    include: { participants: true },
  })

  if (!council) throw new Error(`Council not found: ${councilId}`)

  await db.council.update({
    where: { id: councilId },
    data: { status: "in_progress" },
  })

  emit(councilId, { type: "status", data: { status: "in_progress" } })

  const moderator = council.participants.find((p) => p.role === "moderator")
  const participants = council.participants.filter((p) => p.role === "participant")

  if (!moderator) throw new Error("No moderator found")

  try {
    // Round 1: Moderator opening + Each participant gives initial analysis
    await runRound(council, moderator, participants, 1, "opening")

    // Round 2: Cross-critique - participants respond to each other
    if (council.rounds >= 2) {
      await runRound(council, moderator, participants, 2, "critique")
    }

    // Round 3: Consensus building and final conclusion
    await runRound(council, moderator, participants, council.rounds, "consensus")

    await finalizeCouncil(council)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    let userMessage = `辩论过程出错: ${message}`

    if (message.includes("API key") || message.includes("authentication") || message.includes("401")) {
      userMessage = "LLM API 密钥未配置或无效。请在 .env.local 中设置 OPENAI_API_KEY 和 ANTHROPIC_API_KEY。"
    } else if (message.includes("429")) {
      userMessage = "API 调用频率过高，请稍后再试。"
    } else if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      userMessage = "API 调用超时，请检查网络连接。"
    }

    await db.council.update({
      where: { id: councilId },
      data: { status: "failed" },
    })
    emit(councilId, {
      type: "error",
      data: { message: userMessage },
    })
  }
}

async function runRound(
  council: { id: string; question: string; rounds: number },
  moderator: { id: string; displayName: string; modelName: string; systemPrompt: string; role: string },
  participants: { id: string; displayName: string; modelName: string; systemPrompt: string; role: string }[],
  round: number,
  type: string
) {
  const previousMessages = await db.message.findMany({
    where: { councilId: council.id },
    orderBy: { createdAt: "asc" },
    include: { participant: true },
  })

  const conversationHistory = previousMessages
    .map((m) => `[${m.participant.displayName}]: ${m.content}`)
    .join("\n\n")

  // Moderator guides the round
  let moderatorPrompt: string
  if (round === 1) {
    moderatorPrompt = `你正在主持一场 AI 专家委员会的讨论。

**待讨论问题**：${council.question}

这是第 1 轮讨论（开场陈述轮）。请：
1. 简要概述这个问题
2. 指出需要关注的关键维度
3. 邀请各位专家发表初步观点

请简洁，控制在 3-4 段。`
  } else if (round === council.rounds) {
    moderatorPrompt = `你正在主持一场 AI 专家委员会的讨论。

**待讨论问题**：${council.question}

这是最后一轮（共识与结论轮）。请：
1. 总结前面各方的观点
2. 识别已经达成的共识
3. 对仍有分歧的地方给出你的判断
4. 给出一个清晰、可操作的最终结论

请确保结论包含具体的建议和行动步骤。`
  } else {
    moderatorPrompt = `你正在主持一场 AI 专家委员会的讨论。

**待讨论问题**：${council.question}

这是第 ${round} 轮讨论（交叉辩论轮）。请：
1. 总结上一轮的主要观点
2. 指出各方观点的冲突点和互补点
3. 邀请专家们对他人的观点进行深入讨论

请简洁，推动讨论向共识方向前进。`
  }

  const [provider, modelName] = moderator.modelName.split("/")
  const modModel = getModel(provider, modelName)

  const modResult = await generateText({
    model: modModel,
    system: moderator.systemPrompt,
    messages: [
      ...(conversationHistory
        ? [
            {
              role: "user" as const,
              content: `之前的讨论记录：\n${conversationHistory}`,
            },
          ]
        : []),
      { role: "user" as const, content: moderatorPrompt },
    ],
  })

  const modMessage = await db.message.create({
    data: {
      councilId: council.id,
      participantId: moderator.id,
      content: modResult.text,
      round,
      type: "system",
    },
    include: { participant: true },
  })

  emit(council.id, {
    type: "message",
    data: {
      id: modMessage.id,
      content: modMessage.content,
      round: modMessage.round,
      type: modMessage.type,
      participant: {
        id: moderator.id,
        displayName: moderator.displayName,
        role: "moderator",
      },
      createdAt: modMessage.createdAt.toISOString(),
    },
  })

  let participantPrompt: string
  if (round === 1) {
    participantPrompt = `你正在参加一场 AI 专家委员会的讨论。

**待讨论问题**：${council.question}

**主持人开场**：${modResult.text}

这是第 1 轮（开场陈述轮）。请从你的专业角度发表初步分析。其他专家也会发表他们的观点。`
  } else if (round === council.rounds) {
    participantPrompt = `你正在参加一场 AI 专家委员会的讨论。

**待讨论问题**：${council.question}

**主持人的总结与结论草案**：${modResult.text}

这是最后一轮。请对主持人的总结发表你的看法——你是否同意这个结论？有什么补充或修正建议？`
  } else {
    participantPrompt = `你正在参加一场 AI 专家委员会的讨论。

**待讨论问题**：${council.question}

**主持人引导**：${modResult.text}

这是第 ${round} 轮（交叉辩论轮）。请对其他专家的观点进行回应——你可以赞同、补充、或提出不同意见。`
  }

  for (const p of participants) {
    const conversationSoFar = [...previousMessages, modMessage]
      .map((m) => `[${m.participant.displayName}]: ${m.content}`)
      .join("\n\n")

    const [prov, model] = p.modelName.split("/")
    const pModel = getModel(prov, model)

    const pResult = await generateText({
      model: pModel,
      system: p.systemPrompt,
      messages: [
        {
          role: "user" as const,
          content: `讨论记录：\n${conversationSoFar}\n\n${participantPrompt}`,
        },
      ],
    })

    const pMessage = await db.message.create({
      data: {
        councilId: council.id,
        participantId: p.id,
        content: pResult.text,
        round,
        type,
      },
      include: { participant: true },
    })

    emit(council.id, {
      type: "message",
      data: {
        id: pMessage.id,
        content: pMessage.content,
        round: pMessage.round,
        type: pMessage.type,
        participant: {
          id: p.id,
          displayName: p.displayName,
          role: p.role,
        },
        createdAt: pMessage.createdAt.toISOString(),
      },
    })

    previousMessages.push(pMessage)
  }

  if (round === council.rounds) {
    await extractConsensus(council.id, [...previousMessages, modMessage], round)
  }
}

async function extractConsensus(
  councilId: string,
  messages: { participant: { displayName: string }; content: string }[],
  round: number
) {
  const messagesText = messages
    .map((m) => `[${m.participant.displayName}]: ${m.content}`)
    .join("\n\n")

  const result = await generateText({
    model: openai("gpt-4o"),
    system: `你是一个讨论分析专家。从多 AI 辩论中提取共识点。`,
    messages: [
      {
        role: "user" as const,
        content: `从以下讨论中提取 3-5 个关键共识点（包括已达成共识的内容和主流观点）。每个共识点用一句话表述。返回 JSON 格式：
{ "points": [{ "content": "共识点内容", "agreement": 85 }] }
agreement 是 0-100 的共识度评分。

讨论内容：
${messagesText}`,
      },
    ],
  })

  try {
    const jsonStr = result.text.match(/\{[\s\S]*\}/)?.[0] || "{}"
    const parsed = JSON.parse(jsonStr)
    const points: { content: string; agreement: number }[] = parsed.points || []

    for (const point of points) {
      const consensus = await db.consensusPoint.create({
        data: {
          councilId,
          content: point.content,
          agreement: point.agreement,
          round,
        },
      })

      emit(councilId, {
        type: "consensus",
        data: {
          id: consensus.id,
          content: consensus.content,
          agreement: consensus.agreement,
          round: consensus.round,
        },
      })
    }
  } catch {
    // If JSON parsing fails, skip consensus extraction
  }
}

async function finalizeCouncil(council: { id: string }) {
  const messages = await db.message.findMany({
    where: { councilId: council.id },
    orderBy: { createdAt: "asc" },
    include: { participant: true },
  })

  const conclusion = messages
    .filter((m) => m.type === "consensus" || m.type === "system")
    .map((m) => m.content)
    .join("\n\n")

  await db.council.update({
    where: { id: council.id },
    data: { status: "completed" },
  })

  emit(council.id, {
    type: "status",
    data: {
      status: "completed",
      summary: messages[messages.length - 1]?.content || "讨论已结束",
    },
  })

  emit(council.id, { type: "complete", data: {} })
  removeCouncilEmitter(council.id)
}

export async function startCouncilDebate(councilId: string) {
  runCouncilDebate(councilId).catch(console.error)
}
