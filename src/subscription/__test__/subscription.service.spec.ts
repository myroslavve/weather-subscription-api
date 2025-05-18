import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../email/email.service';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { SubscriptionFrequency } from '../../types';
import { WeatherService } from '../../weather/weather.service';
import { Subscription } from '../schema/subscription.schema';
import { SubscriptionService } from '../subscription.service';
import { CreateSubscriptionDto } from '../types/subscription.dto';

// Create a custom interface for our mocked model constructor
interface SubscriptionModelMock extends jest.Mock {
  findOne: jest.Mock;
  findByIdAndDelete: jest.Mock;
}

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subscriptionModelMock: SubscriptionModelMock;
  let schedulerServiceMock: Partial<SchedulerService>;
  let emailServiceMock: Partial<EmailService>;
  let weatherServiceMock: Partial<WeatherService>;

  const mockSubscriptionDto: CreateSubscriptionDto = {
    email: 'test@example.com',
    city: 'London',
    frequency: SubscriptionFrequency.DAILY,
  };

  const mockToken = 'test-token-123';

  const mockSubscriptionDoc = {
    _id: 'subscription-id-1',
    email: 'test@example.com',
    city: 'London',
    frequency: SubscriptionFrequency.DAILY,
    confirmed: false,
    token: mockToken,
    save: jest.fn().mockResolvedValue({
      _id: 'subscription-id-1',
      email: 'test@example.com',
      city: 'London',
      frequency: SubscriptionFrequency.DAILY,
      confirmed: true,
      token: mockToken,
    }),
  };

  beforeEach(async () => {
    const modelFn = jest
      .fn()
      .mockImplementation((dto: CreateSubscriptionDto) => {
        return {
          ...dto,
          token: mockToken,
          save: jest.fn().mockResolvedValue({
            ...dto,
            token: mockToken,
          }),
        };
      });

    subscriptionModelMock = Object.assign(modelFn, {
      findOne: jest.fn(),
      findByIdAndDelete: jest.fn().mockResolvedValue(true),
    }) as SubscriptionModelMock;

    schedulerServiceMock = {
      scheduleSubscription: jest.fn(),
      removeSubscription: jest.fn(),
    };

    emailServiceMock = {
      sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    };

    weatherServiceMock = {
      isCityValid: jest.fn().mockResolvedValue(true),
    };

    jest
      .spyOn(SubscriptionService.prototype as any, 'generateToken')
      .mockReturnValue(mockToken);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getModelToken(Subscription.name),
          useValue: subscriptionModelMock,
        },
        { provide: SchedulerService, useValue: schedulerServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
        { provide: WeatherService, useValue: weatherServiceMock },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubscription', () => {
    it('should create a new subscription when data is valid', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce(null);

      const result = await service.createSubscription(mockSubscriptionDto);

      expect(weatherServiceMock.isCityValid).toHaveBeenCalledWith('London');
      expect(emailServiceMock.sendConfirmationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'London',
        mockToken,
      );
      expect(result).toEqual(
        expect.objectContaining({
          email: 'test@example.com',
          city: 'London',
          frequency: SubscriptionFrequency.DAILY,
          token: mockToken,
        }),
      );
    });

    it('should throw ConflictException if subscription already exists', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce({
        email: 'test@example.com',
        city: 'London',
      });

      await expect(
        service.createSubscription(mockSubscriptionDto),
      ).rejects.toThrow(ConflictException);
      expect(weatherServiceMock.isCityValid).not.toHaveBeenCalled();
      expect(emailServiceMock.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if city is invalid', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce(null);
      (weatherServiceMock.isCityValid as jest.Mock).mockResolvedValueOnce(
        false,
      );

      await expect(
        service.createSubscription(mockSubscriptionDto),
      ).rejects.toThrow(BadRequestException);
      expect(weatherServiceMock.isCityValid).toHaveBeenCalledWith('London');
      expect(emailServiceMock.sendConfirmationEmail).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should confirm a subscription successfully', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce(mockSubscriptionDoc);

      const result = await service.confirm(mockToken);

      expect(mockSubscriptionDoc.save).toHaveBeenCalled();
      expect(schedulerServiceMock.scheduleSubscription).toHaveBeenCalled();
      expect(result.confirmed).toBe(true);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce(null);

      await expect(service.confirm(mockToken)).rejects.toThrow(
        NotFoundException,
      );
      expect(schedulerServiceMock.scheduleSubscription).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if already confirmed', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce({
        ...mockSubscriptionDoc,
        confirmed: true,
      });

      await expect(service.confirm(mockToken)).rejects.toThrow(
        ConflictException,
      );
      expect(schedulerServiceMock.scheduleSubscription).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe successfully', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce(mockSubscriptionDoc);

      const result = await service.unsubscribe(mockToken);

      expect(schedulerServiceMock.removeSubscription).toHaveBeenCalled();
      expect(subscriptionModelMock.findByIdAndDelete).toHaveBeenCalledWith(
        'subscription-id-1',
      );
      expect(result).toBe(true);
    });

    it('should throw NotFoundException if subscription not found', async () => {
      subscriptionModelMock.findOne.mockResolvedValueOnce(null);

      await expect(service.unsubscribe(mockToken)).rejects.toThrow(
        NotFoundException,
      );
      expect(schedulerServiceMock.removeSubscription).not.toHaveBeenCalled();
      expect(subscriptionModelMock.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });
});
