import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing notification job ${job.id}`);
    
    await job.updateProgress(50);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await job.updateProgress(100);

    return { success: true, message: 'Notification sent successfully' };
  }
}
