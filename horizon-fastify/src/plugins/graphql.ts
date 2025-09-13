import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import mercurius from 'mercurius';
import { GraphQLContext } from '@/graphql/types';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';
import { isDevelopment } from '@config';

// Context function to extract user from JWT and provide request context
async function buildContext(request: FastifyRequest): Promise<GraphQLContext> {
  const context: GraphQLContext = {
    request,
    user: null,
    refreshToken: null,
  };

  // Extract JWT token from Authorization header or cookies
  try {
    // Check Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Verify JWT token (replace with actual JWT verification)
      // For demo purposes, we'll mock a user
      if (token === 'mock-access-token') {
        context.user = {
          id: '1',
          email: 'admin@horizon.dev',
          role: 'ADMIN',
        };
      }
    }

    // Check for refresh token in cookies
    const refreshToken = request.cookies?.refreshToken;
    if (refreshToken) {
      context.refreshToken = refreshToken;
    }
  } catch (error) {
    // Invalid token - context.user remains null
    request.log.debug('Invalid JWT token in GraphQL context');
  }

  return context;
}

async function graphqlPlugin(fastify: FastifyInstance) {
  // Register Mercurius GraphQL plugin
  await fastify.register(mercurius, {
    schema: typeDefs,
    resolvers,
    context: buildContext,
    
    // GraphQL Playground/GraphiQL settings
    graphiql: isDevelopment,
    ide: isDevelopment,
    path: '/graphql',
    
    // Handle GET requests for playground
    routes: true,
    
    // Subscription settings
    subscription: {
      emitter: fastify,
      verifyClient: (info: any, next: any) => {
        // Verify WebSocket connection for subscriptions
        // You can add authentication logic here
        next(true);
      },
    },
    
    // Query complexity and depth limiting
    queryDepth: 10,
    
    // Request/response logging in development
    logLevel: isDevelopment ? 'info' : 'warn',
    
    // Error handling
    errorHandler: (error: any, request: FastifyRequest) => {
      // Log GraphQL errors
      request.log.error(error, 'GraphQL error occurred');
      
      // Don't expose internal errors in production
      if (!isDevelopment) {
        return {
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_ERROR',
          },
        };
      }
      
      return error;
    },
    
    // Enable/disable introspection (should be disabled in production)
    allowBatchedQueries: true,
    
    // Disable persisted queries for playground
    persistedQueries: false,
    
    // Introspection for development
    introspection: isDevelopment,
    
    // Schema validation
    validationRules: [],
  });

  // Add GraphQL schema to Swagger/OpenAPI documentation
  fastify.addHook('onReady', async () => {
    // Log GraphQL endpoint information
    fastify.log.info('🚀 GraphQL server ready');
    fastify.log.info(`  • GraphQL endpoint: http://localhost:${process.env.PORT || 3000}/graphql`);
    if (isDevelopment) {
      fastify.log.info(`  • GraphQL Playground: http://localhost:${process.env.PORT || 3000}/playground`);
    }
  });

  // Health check endpoint for GraphQL
  fastify.get('/graphql/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'graphql',
    };
  });
}

export default fp(graphqlPlugin, {
  name: 'graphql',
  // Remove JWT dependency for now since it's not implemented yet
});