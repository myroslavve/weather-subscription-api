import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mailerServiceMock: Partial<MailerService>;
  let configServiceMock: Partial<ConfigService>;

  beforeEach(async () => {
    mailerServiceMock = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'HOST') return 'http://localhost';
        if (key === 'PORT') return '3000';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mailerServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build proper app URL from config values', async () => {
    const testEmail = 'test@example.com';
    const testCity = 'London';
    const testToken = 'test-token-123';

    await service.sendConfirmationEmail(testEmail, testCity, testToken);

    expect(configServiceMock.get).toHaveBeenCalledWith('HOST');
    expect(configServiceMock.get).toHaveBeenCalledWith('PORT');
    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: testEmail,
        subject: 'Please confirm your Weather API subscription',
        template: './confirmation',
        context: {
          url: 'http://localhost:3000/api/confirm/test-token-123',
          city: testCity,
        },
      }),
    );
  });

  describe('sendConfirmationEmail', () => {
    it('should send confirmation email with correct parameters', async () => {
      const testEmail = 'user@example.com';
      const testCity = 'New York';
      const testToken = 'test-token-abc';

      await service.sendConfirmationEmail(testEmail, testCity, testToken);

      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: testEmail,
        subject: 'Please confirm your Weather API subscription',
        template: './confirmation',
        context: {
          url: 'http://localhost:3000/api/confirm/test-token-abc',
          city: testCity,
        },
      });
    });
  });

  describe('sendWeatherUpdateEmail', () => {
    it('should send weather update email with correct parameters', async () => {
      const testEmail = 'user@example.com';
      const testCity = 'Berlin';
      const testTemperature = 22.5;
      const testHumidity = 65;
      const testDescription = 'Partly cloudy';
      const testToken = 'test-token-xyz';

      const mockDate = new Date('2023-07-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      await service.sendWeatherUpdateEmail(
        testEmail,
        testCity,
        testTemperature,
        testHumidity,
        testDescription,
        testToken,
      );

      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: testEmail,
        subject: `Weather update for ${testCity}`,
        template: './weather-update',
        context: {
          city: testCity,
          temperature: testTemperature,
          humidity: testHumidity,
          description: testDescription,
          timestamp: mockDate.toLocaleString(),
          unsubscribeUrl:
            'http://localhost:3000/api/unsubscribe/test-token-xyz',
        },
      });

      jest.restoreAllMocks();
    });
  });

  describe('error handling', () => {
    it('should propagate errors from mailer service', async () => {
      const testError = new Error('Sending email failed');
      (mailerServiceMock.sendMail as jest.Mock).mockRejectedValueOnce(
        testError,
      );

      await expect(
        service.sendConfirmationEmail('test@example.com', 'London', 'token'),
      ).rejects.toThrow(testError);
    });
  });
});
