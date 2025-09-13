import { createDatabase, getConnection } from './index';
import { users, devices, refreshTokens } from './schema/auth.schema';
import { hash } from 'argon2';
import { nanoid } from 'nanoid';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize database with config
    const db = createDatabase();

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

    console.log('🎉 Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    try {
      await getConnection().end();
    } catch (e) {
      // Ignore connection close errors
    }
    process.exit(0);
  }
}

// Check if this script is being run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase();
}

export { seedDatabase };