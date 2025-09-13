import fp from "fastify-plugin"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import { FastifyInstance } from "fastify"
import {
  jsonSchemaTransform,
  createJsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod"

async function swaggerPlugin(fastify: FastifyInstance) {
  // Set Zod as the type provider
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Horizon API",
        description: "Horizon backend API documentation",
        version: "1.0.0",
      },
      servers: [
        {
          url: process.env.API_BASE_URL || "http://localhost:3000",
        },
      ],
      tags: [
        { name: "entries", description: "Entry management endpoints" },
        { name: "attachments", description: "Attachment management endpoints" },
        { name: "health", description: "Health check endpoints" },
      ],
    },
    transform: jsonSchemaTransform,
  })

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject
    },
    transformSpecificationClone: true,
  })

  fastify.log.info("Swagger documentation available at /docs")
}

export default fp(swaggerPlugin, {
  name: "swagger",
})