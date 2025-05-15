import { Controller, Get, Query } from '@nestjs/common';
import { GetWeatherDto } from './weather.dto';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather(@Query() query: GetWeatherDto) {
    return this.weatherService.getWeather(query.city);
  }
}
