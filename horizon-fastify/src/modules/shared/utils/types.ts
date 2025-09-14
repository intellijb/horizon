export interface ShutdownOptions {
  timeout?: number
  forceExit?: boolean
  signals?: NodeJS.Signals[]
}