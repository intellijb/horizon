#!/bin/bash

# Generate OpenAPI client with proper service naming
# This script generates TypeScript client code from the OpenAPI specification

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting OpenAPI TypeScript client generation...${NC}"

# Start the server in the background to generate OpenAPI spec
echo "Starting server to generate OpenAPI spec..."
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
sleep 5

# Fetch OpenAPI spec
echo "Fetching OpenAPI specification..."
curl -s http://localhost:3000/documentation/json > openapi.json

# Kill the server
kill $SERVER_PID 2>/dev/null

# Check if openapi-typescript-codegen is installed
if ! command -v openapi &> /dev/null; then
    echo "Installing openapi-typescript-codegen..."
    npm install -D @openapitools/openapi-generator-cli openapi-typescript-codegen
fi

# Generate TypeScript client
echo "Generating TypeScript client..."
npx openapi-typescript-codegen \
    --input openapi.json \
    --output ./src/generated/api-client \
    --client axios \
    --name HorizonApiClient \
    --useOptions \
    --useUnionTypes \
    --exportCore true \
    --exportServices true \
    --exportModels true \
    --serviceClassName {tag}Service

echo -e "${GREEN}✓ Client generation complete!${NC}"
echo ""
echo "Generated files:"
echo "  - src/generated/api-client/services/LearningService.ts"
echo "  - src/generated/api-client/services/AuthenticationService.ts"
echo "  - src/generated/api-client/services/UsersService.ts"
echo "  - src/generated/api-client/services/HealthService.ts"
echo ""
echo "Usage example:"
echo "  import { LearningService } from './generated/api-client';"
echo "  const categories = await LearningService.listAllCategories();"

# Clean up
rm -f openapi.json