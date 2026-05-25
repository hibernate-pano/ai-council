import { db } from "@/lib/db"
import { auth } from "@/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "请先登录" }, { status: 401 })
  }

  const { id } = await params

  const council = await db.council.findUnique({
    where: { id },
    include: {
      participants: {
        select: { id: true, displayName: true, role: true, modelName: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          participant: {
            select: { id: true, displayName: true, role: true },
          },
        },
      },
      consensus: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!council) {
    return Response.json({ error: "未找到该讨论" }, { status: 404 })
  }

  if (council.userId !== session.user.id) {
    return Response.json({ error: "无权访问" }, { status: 403 })
  }

  return Response.json({ council })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "请先登录" }, { status: 401 })
  }

  const { id } = await params

  const council = await db.council.findUnique({ where: { id } })
  if (!council) {
    return Response.json({ error: "未找到该讨论" }, { status: 404 })
  }
  if (council.userId !== session.user.id) {
    return Response.json({ error: "无权访问" }, { status: 403 })
  }

  await db.council.delete({ where: { id } })

  return Response.json({ success: true })
}
