import { HttpService } from '@nestjs/axios';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

interface WeatherResponse {
  temperature?: number;
  humidity?: number;
  description?: string;
  message?: string;
}

describe('WeatherController (e2e)', () => {
  let app: INestApplication<App>;

  const mockWeatherApiResponse = {
    location: {
      name: 'London',
      country: 'UK',
    },
    current: {
      temp_c: 20.5,
      humidity: 65,
      condition: {
        text: 'Partly cloudy',
      },
    },
  };

  const mockAxiosResponse = {
    data: mockWeatherApiResponse,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  } as AxiosResponse;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({
        get: jest.fn().mockImplementation((url: string) => {
          if (url.includes('q=London') || url.includes('q=Paris')) {
            return of(mockAxiosResponse);
          }
          return throwError(() => ({
            response: {
              status: 400,
              data: {
                error: {
                  code: 1006,
                  message: 'No matching location found.',
                },
              },
            },
          }));
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /weather', () => {
    it('should return weather data for a valid city', () => {
      return request(app.getHttpServer())
        .get('/weather')
        .query({ city: 'London' })
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as WeatherResponse;
          expect(body.temperature).toBe(20.5);
          expect(body.humidity).toBe(65);
          expect(body.description).toBe('Partly cloudy');
        });
    });

    it('should return 400 when city parameter is missing', () => {
      return request(app.getHttpServer())
        .get('/weather')
        .expect(400)
        .expect((res: request.Response) => {
          const body = res.body as WeatherResponse;
          expect(body.message).toBeDefined();
        });
    });

    it('should return 404 when city is not found', () => {
      return request(app.getHttpServer())
        .get('/weather')
        .query({ city: 'NonExistentCity' })
        .expect(404)
        .expect((res: request.Response) => {
          const body = res.body as WeatherResponse;
          expect(body.message).toContain('City not found');
        });
    });

    it('should return weather data for different valid cities', () => {
      return request(app.getHttpServer())
        .get('/weather')
        .query({ city: 'Paris' })
        .expect(200)
        .expect((res: request.Response) => {
          const body = res.body as WeatherResponse;
          expect(body.temperature).toBe(20.5);
          expect(body.humidity).toBe(65);
          expect(body.description).toBe('Partly cloudy');
        });
    });
  });
});
