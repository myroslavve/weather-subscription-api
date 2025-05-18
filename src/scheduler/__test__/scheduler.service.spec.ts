import { getModelToken } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { CronJob } from 'cron';
import { Model } from 'mongoose';
import { EmailService } from '../../email/email.service';
import {
  Subscription,
  SubscriptionDocument,
} from '../../subscription/schema/subscription.schema';
import { SubscriptionFrequency } from '../../types';
import { WeatherService } from '../../weather/weather.service';
import { SchedulerService } from '../scheduler.service';

jest.mock('cron');

describe('SchedulerService', () => {
  let service: SchedulerService;
  let schedulerRegistryMock: Partial<SchedulerRegistry>;
  let subscriptionModelMock: Partial<Model<SubscriptionDocument>>;
  let emailServiceMock: Partial<EmailService>;
  let weatherServiceMock: Partial<WeatherService>;
  let cronJobMock: Partial<CronJob>;
  let mockCronJobs: Map<string, Partial<CronJob>>;

  const mockSubscription = {
    _id: { toString: () => 'subscription-id-1' },
    email: 'test@example.com',
    city: 'London',
    frequency: SubscriptionFrequency.HOURLY,
    token: 'token-123',
    confirmed: true,
  } as SubscriptionDocument;

  const mockWeatherData = {
    temperature: 22.5,
    humidity: 65,
    description: 'Partly cloudy',
  };

  beforeEach(async () => {
    mockCronJobs = new Map();

    cronJobMock = {
      start: jest.fn(),
    };

    (CronJob as unknown as jest.Mock).mockImplementation(
      (cronTime: string, onTick: (...args: any[]) => void) => {
        return {
          ...cronJobMock,
          cronTime,
          onTick,
        };
      },
    );

    schedulerRegistryMock = {
      getCronJobs: jest.fn().mockReturnValue(mockCronJobs),
      addCronJob: jest.fn().mockImplementation((name: string, job: CronJob) => {
        mockCronJobs.set(name, job);
      }),
      deleteCronJob: jest.fn().mockImplementation((name: string) => {
        mockCronJobs.delete(name);
      }),
    };

    subscriptionModelMock = {
      find: jest.fn().mockResolvedValue([mockSubscription]),
    };

    emailServiceMock = {
      sendWeatherUpdateEmail: jest.fn().mockResolvedValue(undefined),
    };

    weatherServiceMock = {
      getWeather: jest.fn().mockResolvedValue(mockWeatherData),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: SchedulerRegistry, useValue: schedulerRegistryMock },
        {
          provide: getModelToken(Subscription.name),
          useValue: subscriptionModelMock,
        },
        { provide: EmailService, useValue: emailServiceMock },
        { provide: WeatherService, useValue: weatherServiceMock },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should schedule all confirmed subscriptions on module init', async () => {
      const scheduleSpy = jest.spyOn(service, 'scheduleSubscription');

      await service.onModuleInit();

      expect(subscriptionModelMock.find).toHaveBeenCalledWith({
        confirmed: true,
      });
      expect(scheduleSpy).toHaveBeenCalledWith(mockSubscription);
      expect(scheduleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleSubscription', () => {
    it('should create and register a cron job for the subscription', () => {
      service.scheduleSubscription(mockSubscription);

      expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledWith(
        'subscription-id-1',
        expect.any(Object),
      );

      expect(cronJobMock.start).toHaveBeenCalled();

      expect(CronJob).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    });

    it('should replace existing job if one exists for the subscription', () => {
      mockCronJobs.set('subscription-id-1', cronJobMock);

      service.scheduleSubscription(mockSubscription);

      expect(schedulerRegistryMock.deleteCronJob).toHaveBeenCalledWith(
        'subscription-id-1',
      );
      expect(schedulerRegistryMock.addCronJob).toHaveBeenCalledWith(
        'subscription-id-1',
        expect.any(Object),
      );
    });

    it('should use daily frequency when specified', () => {
      const dailySubscription = {
        ...mockSubscription,
        frequency: SubscriptionFrequency.DAILY,
      } as unknown as SubscriptionDocument;

      service.scheduleSubscription(dailySubscription);

      expect(CronJob).toHaveBeenCalledWith('0 9 * * *', expect.any(Function));
    });

    it('should send weather emails when the job executes', async () => {
      let jobCallback: ((args: any[]) => Promise<void>) | undefined;

      (CronJob as unknown as jest.Mock).mockImplementation(
        (cronTime, onTick: (args: any[]) => Promise<void>) => {
          jobCallback = onTick;
          return cronJobMock;
        },
      );

      service.scheduleSubscription(mockSubscription);

      if (jobCallback) await jobCallback([]);

      expect(weatherServiceMock.getWeather).toHaveBeenCalledWith('London');
      expect(emailServiceMock.sendWeatherUpdateEmail).toHaveBeenCalledWith(
        'test@example.com',
        'London',
        22.5,
        65,
        'Partly cloudy',
        'token-123',
      );
    });
  });

  describe('removeSubscription', () => {
    it('should remove a cron job for the subscription', () => {
      mockCronJobs.set('subscription-id-1', cronJobMock);

      service.removeSubscription(mockSubscription);

      expect(schedulerRegistryMock.deleteCronJob).toHaveBeenCalledWith(
        'subscription-id-1',
      );
    });

    it('should not throw if job does not exist', () => {
      service.removeSubscription(mockSubscription);

      expect(schedulerRegistryMock.getCronJobs).toHaveBeenCalled();
      expect(schedulerRegistryMock.deleteCronJob).not.toHaveBeenCalled();
    });
  });
});
