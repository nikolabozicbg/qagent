import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Project, Suite, Case, CaseExecution } from './entities';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://qagent:qagent_dev@localhost:5432/qagent',
  entities: [Project, Suite, Case, CaseExecution],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
