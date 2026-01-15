import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Suite } from './suite.entity';
import { CaseExecution } from './case-execution.entity';

export interface TestStep {
  id: string;
  action: string;
  target: string;
  description: string;
  value?: string;
  selector?: string;
  expectedResult?: string;
  assertions?: string[];
  api?: {
    method: string;
    endpoint: string;
    expectedStatus?: number;
  };
}

export enum CaseStatus {
  NOT_GENERATED = 'NOT_GENERATED',
  GENERATED = 'GENERATED',
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('cases')
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  suiteId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'jsonb' })
  steps: TestStep[];

  @Column({ type: 'jsonb', nullable: true })
  testData: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  generatedCode: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  generatedFilePath: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: CaseStatus.NOT_GENERATED,
  })
  status: CaseStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Suite, (suite) => suite.cases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suiteId' })
  suite: Suite;

  @ManyToOne(() => Project, (project) => project.cases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => CaseExecution, (execution) => execution.case)
  executions: CaseExecution[];
}
