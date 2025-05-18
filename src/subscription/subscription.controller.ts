import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './types/subscription.dto';

@Controller('')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('subscribe')
  @UseInterceptors(FileInterceptor('file'))
  async createSubscription(@Body() subscription: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(subscription);
  }

  @Get('confirm/:token')
  confirm(@Param('token') token: string) {
    return this.subscriptionService.confirm(token);
  }

  @Get('unsubscribe/:token')
  unsubscribe(@Param('token') token: string) {
    return this.subscriptionService.unsubscribe(token);
  }
}
