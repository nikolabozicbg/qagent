import { Injectable, BadRequestException } from '@nestjs/common';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Injectable()
export class UploadService {
  async extractText(file: Express.Multer.File): Promise<string> {
    try {
      const ext = file.originalname.split('.').pop()?.toLowerCase();

      switch (ext) {
        case 'pdf':
          return await this.extractFromPDF(file);
        
        case 'docx':
          return await this.extractFromDOCX(file);
        
        case 'txt':
        case 'md':
          return file.buffer.toString('utf8');
        
        default:
          throw new BadRequestException(`Unsupported file type: ${ext}`);
      }
    } catch (error) {
      throw new BadRequestException(`Failed to extract text: ${error.message}`);
    }
  }

  private async extractFromPDF(file: Express.Multer.File): Promise<string> {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  private async extractFromDOCX(file: Express.Multer.File): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
}
