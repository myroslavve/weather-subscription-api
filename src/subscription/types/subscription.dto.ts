import { IsEmail, IsEnum, IsString } from 'class-validator';
import { SubscriptionFrequency } from 'src/types';

export class CreateSubscriptionDto {
  @IsEmail()
  email: string;

  @IsString()
  city: string;

  @IsEnum(SubscriptionFrequency)
  frequency: SubscriptionFrequency;
}
