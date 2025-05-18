import { HttpService } from '@nestjs/axios';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosRequestHeaders, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { Weather, WeatherApiResponse } from '../../types';
import { WeatherService } from '../weather.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: jest.Mocked<HttpService>;
  let httpServiceGetSpy: jest.SpyInstance;

  const mockWeatherApiResponse: WeatherApiResponse = {
    current: {
      temp_c: 22.5,
      humidity: 65,
      condition: {
        text: 'Partly cloudy',
      },
    },
  };

  const mockWeather: Weather = {
    temperature: 22.5,
    humidity: 65,
    description: 'Partly cloudy',
  };

  beforeEach(async () => {
    const httpServiceMock = {
      get: jest.fn(),
    };
    httpServiceGetSpy = jest.spyOn(httpServiceMock, 'get');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: HttpService, useValue: httpServiceMock },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWeather', () => {
    it('should return weather data for a valid city', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: mockWeatherApiResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as AxiosRequestHeaders },
      };

      httpService.get.mockReturnValueOnce(of(axiosResponse as AxiosResponse));

      const result = await service.getWeather('London');

      expect(httpServiceGetSpy).toHaveBeenCalledWith(
        expect.stringContaining('London'),
      );
      expect(result).toEqual(mockWeather);
    });

    it('should throw NotFoundException for an invalid city', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              code: 1006,
              message: 'No matching location found.',
            },
          },
          status: 400,
        },
      };

      httpService.get.mockReturnValueOnce(throwError(() => errorResponse));

      await expect(service.getWeather('InvalidCity')).rejects.toThrow(
        NotFoundException,
      );
      expect(httpServiceGetSpy).toHaveBeenCalledWith(
        expect.stringContaining('InvalidCity'),
      );
    });

    it('should propagate other errors', async () => {
      const networkError = new Error('Network error');

      httpService.get.mockReturnValueOnce(throwError(() => networkError));

      await expect(service.getWeather('London')).rejects.toThrow(networkError);
    });
  });

  describe('isCityValid', () => {
    it('should return true for a valid city', async () => {
      const axiosResponse: Partial<AxiosResponse> = {
        data: mockWeatherApiResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as AxiosRequestHeaders },
      };

      httpService.get.mockReturnValueOnce(of(axiosResponse as AxiosResponse));

      const result = await service.isCityValid('London');

      expect(result).toBe(true);
      expect(httpServiceGetSpy).toHaveBeenCalledWith(
        expect.stringContaining('London'),
      );
    });

    it('should return false for an invalid city', async () => {
      const errorResponse = {
        response: {
          data: {
            error: {
              code: 1006,
              message: 'No matching location found.',
            },
          },
          status: 400,
        },
      };

      httpService.get.mockReturnValueOnce(throwError(() => errorResponse));

      const result = await service.isCityValid('InvalidCity');

      expect(result).toBe(false);
      expect(httpServiceGetSpy).toHaveBeenCalledWith(
        expect.stringContaining('InvalidCity'),
      );
    });

    it('should propagate unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');

      httpService.get.mockReturnValueOnce(throwError(() => unexpectedError));

      await expect(service.isCityValid('London')).rejects.toThrow(
        unexpectedError,
      );
    });
  });
});
