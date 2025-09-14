import { AuthConstants } from "../../constants/auth.constants"

export interface UserEntity {
  id: string
  email: string
  username: string | null
  passwordHash?: string
  firstName?: string | null
  lastName?: string | null
  role: "user" | "admin"
  isActive: boolean
  emailVerified: boolean
  mfaEnabled: boolean
  mfaSecret?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserCreateData {
  email: string
  username?: string
  passwordHash: string
  firstName?: string
  lastName?: string
  role?: "user" | "admin"
}

export interface UserUpdateData {
  username?: string
  firstName?: string
  lastName?: string
  role?: "user" | "admin"
  isActive?: boolean
  emailVerified?: boolean
  mfaEnabled?: boolean
  mfaSecret?: string | null
}

export class User implements UserEntity {
  constructor(
    public id: string,
    public email: string,
    public username: string | null,
    public passwordHash: string | undefined,
    public firstName: string | null | undefined,
    public lastName: string | null | undefined,
    public role: "user" | "admin",
    public isActive: boolean,
    public emailVerified: boolean,
    public mfaEnabled: boolean,
    public mfaSecret: string | null | undefined,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(data: UserEntity): User {
    return new User(
      data.id,
      data.email,
      data.username,
      data.passwordHash,
      data.firstName,
      data.lastName,
      data.role,
      data.isActive,
      data.emailVerified,
      data.mfaEnabled,
      data.mfaSecret,
      data.createdAt,
      data.updatedAt,
    )
  }

  static createNew(data: {
    id: string
    email: string
    username?: string
    passwordHash: string
    firstName?: string
    lastName?: string
    role?: "user" | "admin"
  }): User {
    const now = new Date()
    return new User(
      data.id,
      data.email,
      data.username || null,
      data.passwordHash,
      data.firstName || null,
      data.lastName || null,
      data.role || AuthConstants.DEFAULT_ROLE,
      true, // isActive
      false, // emailVerified
      false, // mfaEnabled
      null, // mfaSecret
      now,
      now,
    )
  }

  toPublicJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      mfaEnabled: this.mfaEnabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }

  canLogin(): boolean {
    return this.isActive
  }

  requiresEmailVerification(): boolean {
    return !this.emailVerified
  }

  requiresMfa(): boolean {
    return this.mfaEnabled && !!this.mfaSecret
  }
}