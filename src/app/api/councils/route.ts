import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { createCouncil, startCouncilDebate } from "@/lib/council-engine"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "请先登录" }, { status: 401 })
  }

  const { question, rounds = 3, participants } = await request.json()

  if (!question || question.trim().length < 5) {
    return Response.json({ error: "问题至少需要 5 个字符" }, { status: 400 })
  }

  const council = await createCouncil(question, session.user.id, rounds, participants)

  startCouncilDebate(council.id)

  return Response.json({ id: council.id, status: council.status })
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "请先登录" }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50)

  const councils = await db.council.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      participants: {
        select: { id: true, displayName: true, role: true },
      },
      _count: {
        select: { messages: true, consensus: true },
      },
    },
  })

  const total = await db.council.count({
    where: { userId: session.user.id },
  })

  return Response.json({
    councils,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
