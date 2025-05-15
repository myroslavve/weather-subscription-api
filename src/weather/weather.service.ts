import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { Weather, WeatherApiError, WeatherApiResponse } from 'src/types';

@Injectable()
export class WeatherService {
  constructor(private readonly httpService: HttpService) {}

  async getWeather(city: string): Promise<Weather> {
    const { data } = await firstValueFrom(
      this.httpService
        .get<WeatherApiResponse>(
          `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`,
        )
        .pipe(
          catchError((error: AxiosError<WeatherApiError>) => {
            if (error.response?.data.error.code === 1006) {
              throw new NotFoundException(`City not found: ${city}`);
            }
            throw error;
          }),
        ),
    );

    return {
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      description: data.current.condition.text,
    };
  }
}
