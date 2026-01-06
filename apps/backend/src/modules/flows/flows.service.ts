import { Injectable, NotFoundException } from '@nestjs/common';
import { Flow, CreateFlowDto, UpdateFlowDto } from './flows.types';

@Injectable()
export class FlowsService {
  // In-memory storage: Map<projectPath, Map<flowId, Flow>>
  private flows: Map<string, Map<string, Flow>> = new Map();

  /**
   * Get all flows for a project
   */
  getFlows(projectPath: string): Flow[] {
    const projectFlows = this.flows.get(projectPath);
    if (!projectFlows) {
      return [];
    }
    return Array.from(projectFlows.values());
  }

  /**
   * Get a single flow by ID
   */
  getFlow(flowId: string, projectPath: string): Flow {
    const projectFlows = this.flows.get(projectPath);
    if (!projectFlows) {
      throw new NotFoundException(`Flow with ID ${flowId} not found`);
    }

    const flow = projectFlows.get(flowId);
    if (!flow) {
      throw new NotFoundException(`Flow with ID ${flowId} not found`);
    }

    return flow;
  }

  /**
   * Create a new flow
   */
  createFlow(dto: CreateFlowDto): Flow {
    const flowId = this.generateFlowId();
    const now = Date.now();

    const flow: Flow = {
      id: flowId,
      name: dto.name,
      priority: dto.priority,
      status: 'no-tests',
      route: dto.route,
      components: dto.components || 0,
      apis: dto.apis || 0,
      enriched: dto.enriched || false,
      confidence: dto.confidence,
      projectPath: dto.projectPath,
      createdAt: now,
      updatedAt: now,
      enrichedData: dto.enrichedData,
      steps: dto.steps,
    };

    // Ensure project map exists
    if (!this.flows.has(dto.projectPath)) {
      this.flows.set(dto.projectPath, new Map());
    }

    // Add flow to storage
    this.flows.get(dto.projectPath)!.set(flowId, flow);

    console.log(`✅ Created flow: ${flow.name} (${flowId}) for project: ${dto.projectPath}`);

    return flow;
  }

  /**
   * Update an existing flow
   */
  updateFlow(flowId: string, projectPath: string, dto: UpdateFlowDto): Flow {
    const projectFlows = this.flows.get(projectPath);
    if (!projectFlows) {
      throw new NotFoundException(`Flow with ID ${flowId} not found`);
    }

    const flow = projectFlows.get(flowId);
    if (!flow) {
      throw new NotFoundException(`Flow with ID ${flowId} not found`);
    }

    // Update fields
    const updatedFlow: Flow = {
      ...flow,
      ...dto,
      updatedAt: Date.now(),
    };

    projectFlows.set(flowId, updatedFlow);

    console.log(`✅ Updated flow: ${flowId}`);

    return updatedFlow;
  }

  /**
   * Delete a flow
   */
  deleteFlow(flowId: string, projectPath: string): void {
    const projectFlows = this.flows.get(projectPath);
    if (!projectFlows) {
      throw new NotFoundException(`Flow with ID ${flowId} not found`);
    }

    const deleted = projectFlows.delete(flowId);
    if (!deleted) {
      throw new NotFoundException(`Flow with ID ${flowId} not found`);
    }

    console.log(`✅ Deleted flow: ${flowId}`);
  }

  /**
   * Bulk import flows from journey discovery
   */
  importJourneys(journeys: any[], projectPath: string): Flow[] {
    const importedFlows: Flow[] = [];

    for (const journey of journeys) {
      const flow = this.createFlow({
        name: journey.name,
        priority: this.mapPriorityFromNumber(journey.priority),
        route: this.extractRoute(journey),
        components: journey.steps?.length || 0,
        apis: this.countApis(journey),
        enriched: journey.status === 'enriched',
        confidence: journey.confidence || 90,
        projectPath,
        enrichedData: journey.enrichedData,
        steps: journey.steps,
      });

      importedFlows.push(flow);
    }

    console.log(`✅ Imported ${importedFlows.length} flows for project: ${projectPath}`);

    return importedFlows;
  }

  /**
   * Get flow statistics for a project
   */
  getFlowStats(projectPath: string) {
    const flows = this.getFlows(projectPath);

    return {
      total: flows.length,
      byStatus: {
        noTests: flows.filter(f => f.status === 'no-tests').length,
        passing: flows.filter(f => f.status === 'passing').length,
        partial: flows.filter(f => f.status === 'partial').length,
        failing: flows.filter(f => f.status === 'failing').length,
      },
      byPriority: {
        critical: flows.filter(f => f.priority === 'CRITICAL').length,
        high: flows.filter(f => f.priority === 'HIGH').length,
        medium: flows.filter(f => f.priority === 'MEDIUM').length,
        low: flows.filter(f => f.priority === 'LOW').length,
      },
      enriched: flows.filter(f => f.enriched).length,
    };
  }

  // Helper methods

  private generateFlowId(): string {
    return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapPriorityFromNumber(priority: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (priority === 1) return 'CRITICAL';
    if (priority === 2) return 'HIGH';
    if (priority === 3) return 'MEDIUM';
    return 'LOW';
  }

  private extractRoute(journey: any): string {
    if (journey.route) return journey.route;
    if (journey.steps && journey.steps.length > 0) {
      return journey.steps.map((s: any) => s.route || s.description).filter(Boolean).join(' → ');
    }
    return '/';
  }

  private countApis(journey: any): number {
    if (journey.enrichedData?.components) {
      return journey.enrichedData.components.reduce((sum: number, comp: any) => {
        return sum + (comp.apiCalls?.length || 0);
      }, 0);
    }
    return 0;
  }
}
