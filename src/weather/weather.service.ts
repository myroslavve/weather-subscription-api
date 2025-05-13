import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Weather, WeatherApiResponse } from 'src/types';

@Injectable()
export class WeatherService {
  constructor(private readonly httpService: HttpService) {}

  async getWeather(city: string): Promise<Weather> {
    const { data } = await firstValueFrom(
      this.httpService.get<WeatherApiResponse>(
        `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`,
      ),
    );

    return {
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      description: data.current.condition.text,
    };
  }
}
