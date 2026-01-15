import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Project, Suite, Case, CaseExecution } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        // If no DATABASE_URL, run in "no-db" mode (backward compatible)
        if (!databaseUrl) {
          console.log('⚠️  DATABASE_URL not set - running without database persistence');
          return {
            type: 'postgres',
            autoLoadEntities: true,
            synchronize: false,
            // This will fail to connect but won't crash the app
            host: 'localhost',
            port: 5432,
            username: 'none',
            password: 'none',
            database: 'none',
            // Disable actual connection attempts
            extra: {
              connectionLimit: 0,
            },
          };
        }

        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          type: 'postgres',
          url: databaseUrl,
          entities: [Project, Suite, Case, CaseExecution],
          // Auto-sync in development (creates tables automatically)
          // In production, use migrations
          synchronize: !isProduction,
          logging: !isProduction ? ['error', 'warn'] : false,
          // SSL for Supabase
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    // Export repositories for use in other modules
    TypeOrmModule.forFeature([Project, Suite, Case, CaseExecution]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
