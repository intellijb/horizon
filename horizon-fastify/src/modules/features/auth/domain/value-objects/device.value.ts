import { DeviceType } from "../../constants/auth.constants"

export interface DeviceInfo {
  id: string
  userId: string
  name: string
  deviceType: DeviceType
  userAgent?: string
  ipAddress?: string
  lastActive: Date
  isTrusted: boolean
  createdAt: Date
  updatedAt: Date
}

export class Device implements DeviceInfo {
  constructor(
    public id: string,
    public userId: string,
    public name: string,
    public deviceType: DeviceType,
    public userAgent: string | undefined,
    public ipAddress: string | undefined,
    public lastActive: Date,
    public isTrusted: boolean,
    public createdAt: Date,
    public updatedAt: Date,
  ) {}

  static detectType(userAgent?: string): DeviceType {
    if (!userAgent) return "Unknown"

    const ua = userAgent.toLowerCase()
    if (ua.includes("mobile")) return "Mobile"
    if (ua.includes("tablet")) return "Tablet"
    if (ua.includes("desktop")) return "Desktop"

    return "Web"
  }

  updateLastActive(): void {
    this.lastActive = new Date()
    this.updatedAt = new Date()
  }

  trust(): void {
    this.isTrusted = true
    this.updatedAt = new Date()
  }

  untrust(): void {
    this.isTrusted = false
    this.updatedAt = new Date()
  }
}