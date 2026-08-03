import { Provider } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

class MockQueue {
  async add(name: string, data: any) {
    throw new Error('Redis/Queue is disabled on this instance. Please configure REDIS_HOST or REDIS_URL to enable queue processing.');
  }

  async getJob(id: string) {
    return null;
  }

  async getJobCounts() {
    return { active: 0, completed: 0, failed: 0, delayed: 0, waiting: 0, paused: 0 };
  }
}

const queueNames = ['submission-sync', 'import', 'export', 'notification'];

export const createMockQueueProviders = (): Provider[] => {
  return queueNames.map((name) => ({
    provide: getQueueToken(name),
    useClass: MockQueue,
  }));
};
