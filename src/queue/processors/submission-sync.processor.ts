import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('submission-sync')
export class SubmissionSyncProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing submission sync job ${job.id}`);
    
    // Simulate some work and progress
    await job.updateProgress(50);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await job.updateProgress(100);

    return { success: true, message: 'Submission synced successfully' };
  }
}
