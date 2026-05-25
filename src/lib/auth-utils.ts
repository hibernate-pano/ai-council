import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { auth } from "@/auth"

const BCRYPT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function registerUser(
  email: string,
  password: string,
  name?: string
) {
  const existing = await db.user.findUnique({ where: { email } })

  if (existing) {
    throw new DuplicateEmailError()
  }

  const passwordHash = await hashPassword(password)

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? email.split("@")[0],
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
    },
  })

  return user
}

export async function getCurrentUser() {
  const session = await auth()

  if (!session?.user?.email) {
    return null
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
    },
  })

  return user
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("该邮箱已被注册")
    this.name = "DuplicateEmailError"
  }
}
