import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Suite } from './suite.entity';
import { Case } from './case.entity';
import { CaseExecution } from './case-execution.entity';

export interface AuthConfig {
  enabled: boolean;
  username: string;
  password: string;
  loginRoute?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  successUrlPattern?: string;
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  projectPath: string;

  @Column({ type: 'varchar', length: 255 })
  projectName: string;

  @Column({ type: 'varchar', length: 50 })
  framework: 'playwright' | 'cypress';

  @Column({ type: 'varchar', length: 500 })
  baseUrl: string;

  @Column({ type: 'varchar', length: 255, default: 'tests/e2e' })
  testDir: string;

  @Column({ type: 'jsonb', nullable: true })
  auth: AuthConfig | null;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Suite, (suite) => suite.project)
  suites: Suite[];

  @OneToMany(() => Case, (testCase) => testCase.project)
  cases: Case[];

  @OneToMany(() => CaseExecution, (execution) => execution.project)
  executions: CaseExecution[];
}
