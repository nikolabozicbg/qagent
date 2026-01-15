import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Suite } from './suite.entity';
import { Case } from './case.entity';

export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('case_executions')
export class CaseExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  caseId: string;

  @Column({ type: 'uuid' })
  suiteId: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 30 })
  status: ExecutionStatus;

  @Column({ type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'text', nullable: true })
  errorStack: string | null;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  // Relations
  @ManyToOne(() => Case, (testCase) => testCase.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  case: Case;

  @ManyToOne(() => Suite, (suite) => suite.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suiteId' })
  suite: Suite;

  @ManyToOne(() => Project, (project) => project.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
