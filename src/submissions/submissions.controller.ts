import {
  Controller, Post, Get, Body, Req, Param, Patch,
  Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus, Query
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import * as jwt from 'jsonwebtoken';
import { AuditLogAction } from '../common/decorators/audit.decorator';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post(':formId')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @AuditLogAction('SUBMISSION_CREATE', 'Submission')
  async create(@Param('formId') formId: string, @Body() createSubmissionDto: any, @Req() req: any) {
    let submitterId: string | undefined;
    let submitterName: string | undefined;

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        submitterId = decoded.sub;
        submitterName = decoded.name;
      } catch (e) {
        // Ignore invalid token, treat as anonymous
      }
    }

    return this.submissionsService.create(formId, createSubmissionDto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: any) {
    if (req.user.role === 'ENUMERATOR') {
      throw new BadRequestException('Enumerators cannot list all submissions');
    }
    return this.submissionsService.findAll(req.user);
  }

  @Get('form/:formId')
  @UseGuards(JwtAuthGuard)
  findByForm(
    @Param('formId') formId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
    return this.submissionsService.findByForm(formId, p, l, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('SUBMISSION_UPDATE', 'Submission')
  update(@Param('id') id: string, @Body() updateSubmissionDto: any, @Req() req: any) {
    return this.submissionsService.update(id, updateSubmissionDto, req.user);
  }

  @Get('mine/:formId')
  @UseGuards(JwtAuthGuard)
  findMySubmissions(
    @Param('formId') formId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const p = Math.max(1, parseInt(page || '1', 10));
    const l = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
    return this.submissionsService.findByFormAndSubmitter(formId, req.user.sub, p, l);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('SUBMISSION_DELETE', 'Submission')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.submissionsService.remove(id, req.user);
  }

  @Post('form/:formId/import')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @AuditLogAction('IMPORT_SUBMISSIONS', 'Submission')
  importSubmissions(@Param('formId') formId: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.submissionsService.importSubmissions(formId, file.buffer, req.user);
  }

  /**
   * Bulk sync endpoint — accepts an array of offline submissions and inserts them.
   * POST /submissions/sync/bulk
   * Body: { submissions: Array<{ formId, localId, data, gpsLocation?, submitterName?, createdAt? }> }
   */
  @Post('sync/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLogAction('SYNC_BULK', 'Submission')
  async bulkSync(
    @Body() body: { submissions: Array<{ formId: string; localId: string; data: any; gpsLocation?: any; submitterName?: string; createdAt?: string }> },
    @Req() req: any,
  ) {
    const results: Array<{ localId: string; serverId?: string; status: 'synced' | 'failed'; error?: string }> = [];
    for (const item of body.submissions) {
      try {
        const saved = await this.submissionsService.create(
          item.formId,
          { data: item.data, gpsLocation: item.gpsLocation },
          { ...req.user, name: item.submitterName || req.user.name }
        );
        results.push({ localId: item.localId, serverId: saved.id, status: 'synced' });
      } catch (err: any) {
        results.push({ localId: item.localId, status: 'failed', error: err.message });
      }
    }
    return { results, synced: results.filter(r => r.status === 'synced').length, failed: results.filter(r => r.status === 'failed').length };
  }

  /**
   * Sync status endpoint — returns server submission count for a given device identifier.
   * GET /submissions/sync/status/:deviceId
   */
  @Get('sync/status/:deviceId')
  @UseGuards(JwtAuthGuard)
  async syncStatus(@Param('deviceId') deviceId: string, @Req() req: any) {
    const count = await this.submissionsService.countBySubmitter(req.user.sub);
    return { submitterId: req.user.sub, deviceId, serverCount: count, timestamp: new Date().toISOString() };
  }

  /**
   * Retry failed sync — identical contract to bulk sync, for explicit retries from client.
   * POST /submissions/sync/retry
   */
  @Post('sync/retry')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLogAction('SYNC_RETRY', 'Submission')
  async retrySync(
    @Body() body: { submissions: Array<{ formId: string; localId: string; data: any; gpsLocation?: any; submitterName?: string }> },
    @Req() req: any,
  ) {
    // Retry uses same logic as bulk sync — result-level granularity
    return this.bulkSync(body, req);
  }
}
