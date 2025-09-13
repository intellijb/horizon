# Horizon Project Instructions

## Project Structure
- `horizon-fastify/` - Main Fastify API server (follows horizon-fastify/CONVENTION.md)
- `horizon-sse-go/` - Go SSE streaming service  
- `horizon-infra/` - Infrastructure and deployment configs

## Development Commands
- `npm run dev` - Start development server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Drizzle Studio