import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import { FastifyInstance } from "fastify";

async function scalarPlugin(fastify: FastifyInstance) {
  // Register Swagger without Zod transform temporarily
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
          url: process.env.API_BASE_URL || "http://api.intellijb.com",
        },
      ],
      tags: [
        { name: "entries", description: "Entry management endpoints" },
        { name: "attachments", description: "Attachment management endpoints" },
        { name: "health", description: "Health check endpoints" },
      ],
    },
  });

  // Register Scalar API Reference
  await fastify.register(scalar, {
    routePrefix: "/docs",
    configuration: {
      theme: "purple",
      hideModels: false,
      hideDownloadButton: false,
    },
  });

  fastify.log.info("API documentation available at /docs");
}

export default fp(scalarPlugin, {
  name: "scalar",
});
