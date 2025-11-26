import { Body, Controller, Post } from '@nestjs/common';
import { GenerationService } from './generation.service';

@Controller('generate')
export class GenerationController {
  constructor(private readonly generation: GenerationService) {}

  @Post('test-suite')
  async generateSuite(@Body() body: { 
    input: string; 
    url?: string; 
    outputTypes?: string[];
  }) {
    return this.generation.generateSuite(body);
  }

  @Post('refine')
  async refine(@Body() body: { 
    existingOutput: any;
    refinementPrompt: string;
  }) {
    return this.generation.refineOutput(body);
  }

  // New endpoint for VS Code extension
  @Post('tests')
  async generateTests(@Body() body: {
    code: string;
    fileName: string;
    language: string;
  }) {
    return this.generation.generateTestsFromCode(body);
  }
}
