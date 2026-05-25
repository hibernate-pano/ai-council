import { getCouncilEmitter } from "@/lib/council-engine"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const council = await db.council.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!council) {
    return Response.json({ error: "未找到该讨论" }, { status: 404 })
  }

  const encoder = new TextEncoder()
  const emitter = getCouncilEmitter(id)

  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const handler = (event: Record<string, unknown>) => {
        if (closed) return
        const data = `data: ${JSON.stringify(event)}\n\n`
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          closed = true
        }
      }

      emitter.on("event", handler)

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", data: { status: council.status } })}\n\n`
        )
      )

      if (council.status === "completed" || council.status === "failed") {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "complete", data: { status: council.status } })}\n\n`
          )
        )
        controller.close()
        return
      }

      const interval = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"))
        } catch {
          closed = true
          clearInterval(interval)
        }
      }, 15000)

      let cleanedUp = false
      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        closed = true
        emitter.off("event", handler)
        clearInterval(interval)
        try { controller.close() } catch { /* already closed */ }
      }

      emitter.once("complete", cleanup)

      if (request.signal) {
        request.signal.addEventListener("abort", cleanup)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
