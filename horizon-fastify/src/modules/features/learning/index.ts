/**
 * Learning module exports
 * Public API for the spaced-repetition learning platform
 */

// Constants
export * from "./constants"

// Domain
export * from "./domain/entities"
export * from "./domain/ports"

// Business
export * from "./business/spaced-repetition.service"
export * from "./business/evaluation.service"
export * from "./business/validation.service"

// Application
export * from "./application/use-cases"
export { LearningController } from "./application/learning.controller"
export * from "./application/dto"

// Extensions
export * from "./extensions/learning.repository"
