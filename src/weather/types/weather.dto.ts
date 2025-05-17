import { IsNotEmpty, IsString } from 'class-validator';

export class GetWeatherDto {
  @IsNotEmpty()
  @IsString()
  city: string;
}
