import { Pool } from 'pg';
import { dbConfig } from '@config';
import { createDatabase } from '@modules/platform/database/drizzle-manager';
import { users, devices } from '@/modules/features/auth/extensions/schema';
import { hash } from 'argon2';
import { nanoid } from 'nanoid';
import { seedInterviewData } from '@modules/features/interview/extensions/seed/interview-seed';

async function seedDatabase() {
  // Create a new pool for seeding
  const pool = new Pool({
    connectionString: dbConfig.connectionString,
    max: 1,
  });
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize database with pool
    const db = createDatabase(pool);

    // Create test user
    const testPassword = await hash('test123456');
    const testUser = await db
      .insert(users)
      .values({
        email: 'test@horizon.dev',
        username: 'testuser',
        passwordHash: testPassword,
        emailVerified: true,
        isActive: true,
      })
      .returning();

    console.log('✅ Created test user:', testUser[0].email);

    // Create a test device for the user
    const testDevice = await db
      .insert(devices)
      .values({
        userId: testUser[0].id,
        deviceName: 'Development Machine',
        deviceType: 'desktop',
        deviceFingerprint: nanoid(32),
        trusted: true,
      })
      .returning();

    console.log('✅ Created test device:', testDevice[0].deviceName);

    // Seed interview data
    console.log('🌱 Seeding interview data...');
    await seedInterviewData();

    console.log('🎉 Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await pool.end();
    process.exit(0);
  }
}

// Check if this script is being run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase();
}

export { seedDatabase };