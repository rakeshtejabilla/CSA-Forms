import { Module } from '@nestjs/common';
import { PrebuiltTemplatesService } from './prebuilt-templates.service';
import { PrebuiltTemplatesController } from './prebuilt-templates.controller';

@Module({
  controllers: [PrebuiltTemplatesController],
  providers: [PrebuiltTemplatesService],
  exports: [PrebuiltTemplatesService],
})
export class PrebuiltTemplatesModule {}
