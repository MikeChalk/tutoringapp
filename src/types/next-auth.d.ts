// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { DefaultSession } from "next-auth"

// Module augmentation for next-auth — adds custom fields to session/JWT types

declare module "next-auth" {
  interface User {
    role?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      impersonatedBy?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    impersonatedBy?: string
  }
}
