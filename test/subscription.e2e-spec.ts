import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';
import { Subscription } from '../src/subscription/schema/subscription.schema';
import { SubscriptionFrequency } from '../src/types';
import { WeatherService } from '../src/weather/weather.service';

class MockEmailService {
  sendConfirmationEmail() {
    return Promise.resolve(true);
  }

  sendWeatherUpdateEmail() {
    return Promise.resolve(true);
  }
}

interface ResponseBody {
  message?: string;
  token?: string;
  email?: string;
  city?: string;
  frequency?: string;
  confirmed?: boolean;
}

describe('SubscriptionController (e2e)', () => {
  let app: INestApplication<App>;
  let subscriptionModel: Model<Subscription>;
  let connection: Connection;

  const mockSubscription = {
    email: 'test@example.com',
    city: 'London',
    frequency: SubscriptionFrequency.DAILY,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WeatherService)
      .useValue({
        isCityValid: jest.fn().mockImplementation((city: string) => {
          return Promise.resolve(city === 'London' || city === 'Paris');
        }),
      })
      .overrideProvider(EmailService)
      .useClass(MockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe());

    subscriptionModel = moduleFixture.get<Model<Subscription>>(
      getModelToken(Subscription.name),
    );

    connection = moduleFixture.get<Connection>(getConnectionToken());

    await app.init();

    await subscriptionModel.deleteMany({});
  });

  afterEach(async () => {
    await subscriptionModel.deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
    await app.close();
  });

  describe('POST /subscribe', () => {
    it('should create a new subscription successfully', () => {
      return request(app.getHttpServer())
        .post('/subscribe')
        .send(mockSubscription)
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.email).toBe(mockSubscription.email);
          expect(body.city).toBe(mockSubscription.city);
          expect(body.frequency).toBe(mockSubscription.frequency);
          expect(body.confirmed).toBe(false);
          expect(body.token).toBeDefined();
        });
    });

    it('should return 409 when email is already subscribed', async () => {
      await request(app.getHttpServer())
        .post('/subscribe')
        .send(mockSubscription)
        .expect(201);

      return request(app.getHttpServer())
        .post('/subscribe')
        .send(mockSubscription)
        .expect(409)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('Email already subscribed');
        });
    });

    it('should return 400 when city is invalid', () => {
      return request(app.getHttpServer())
        .post('/subscribe')
        .send({
          ...mockSubscription,
          city: 'NonExistentCity',
        })
        .expect(400)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('Invalid city');
        });
    });

    it('should return 400 when request data is invalid', () => {
      return request(app.getHttpServer())
        .post('/subscribe')
        .send({
          email: 'invalid-email',
          city: 'London',
          frequency: 'weekly', // Invalid frequency
        })
        .expect(400);
    });
  });

  describe('GET /confirm/:token', () => {
    it('should confirm a subscription successfully', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/subscribe')
        .send(mockSubscription)
        .expect(201);

      const body = createResponse.body as ResponseBody;
      const token = body.token as string;

      return request(app.getHttpServer())
        .get(`/confirm/${token}`)
        .expect(200)
        .expect((res: request.Response) => {
          const responseBody = res.body as ResponseBody;
          expect(responseBody.confirmed).toBe(true);
        });
    });

    it('should return 404 when token is not found', () => {
      return request(app.getHttpServer())
        .get('/confirm/non-existent-token')
        .expect(404)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('Subscription not found');
        });
    });

    it('should return 409 when subscription is already confirmed', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/subscribe')
        .send(mockSubscription)
        .expect(201);

      const body = createResponse.body as ResponseBody;
      const token = body.token as string;

      await request(app.getHttpServer()).get(`/confirm/${token}`).expect(200);

      return request(app.getHttpServer())
        .get(`/confirm/${token}`)
        .expect(409)
        .expect((res: request.Response) => {
          const responseBody = res.body as ResponseBody;
          expect(responseBody.message).toContain('Already confirmed');
        });
    });
  });

  describe('GET /unsubscribe/:token', () => {
    it('should unsubscribe successfully', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/subscribe')
        .send(mockSubscription)
        .expect(201);

      const body = createResponse.body as ResponseBody;
      const token = body.token as string;

      return request(app.getHttpServer())
        .get(`/unsubscribe/${token}`)
        .expect(200);
    });

    it('should return 404 when token is not found', () => {
      return request(app.getHttpServer())
        .get('/unsubscribe/non-existent-token')
        .expect(404)
        .expect((res: request.Response) => {
          const body = res.body as ResponseBody;
          expect(body.message).toContain('Token not found');
        });
    });
  });
});
