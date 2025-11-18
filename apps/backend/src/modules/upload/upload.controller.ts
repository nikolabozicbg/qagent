import { 
  Controller, 
  Post, 
  UploadedFile, 
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('extract')
  @UseInterceptors(FileInterceptor('file'))
  async extract(@UploadedFile() file: Express.Multer.File) {
    console.log(`📄 Upload request received`);
    
    if (!file) {
      console.log(`❌ No file uploaded`);
      throw new BadRequestException('No file uploaded');
    }

    console.log(`📎 File: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB, ${file.mimetype})`);

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      console.log(`❌ Invalid file type: ${file.mimetype}`);
      throw new BadRequestException('Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed.');
    }

    console.log(`🔄 Extracting text from ${file.originalname}...`);
    const text = await this.uploadService.extractText(file);
    console.log(`✅ Extracted ${text.length} characters`);
    
    return {
      text,
      filename: file.originalname,
      size: file.size,
      extractedAt: new Date().toISOString(),
    };
  }
}
