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
import { Case } from './case.entity';
import { CaseExecution } from './case-execution.entity';

export interface SuiteMetadata {
  components?: string[];
  routes?: string[];
  characteristics?: string[];
}

@Entity('suites')
export class Suite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 20 })
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: SuiteMetadata | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.suites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => Case, (testCase) => testCase.suite)
  cases: Case[];

  @OneToMany(() => CaseExecution, (execution) => execution.suite)
  executions: CaseExecution[];
}
