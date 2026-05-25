import { NextRequest } from "next/server"
import { registerUser, DuplicateEmailError } from "@/lib/auth-utils"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; name?: string }

  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "请求格式无效" },
      { status: 400 }
    )
  }

  const { email, password, name } = body

  if (!email || !password) {
    return Response.json(
      { error: "邮箱和密码为必填项" },
      { status: 400 }
    )
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return Response.json(
      { error: "邮箱格式不正确" },
      { status: 400 }
    )
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `密码至少需要 ${MIN_PASSWORD_LENGTH} 个字符` },
      { status: 400 }
    )
  }

  try {
    const user = await registerUser(email, password, name)
    return Response.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return Response.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return Response.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    )
  }
}
