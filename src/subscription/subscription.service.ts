import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { EmailService } from 'src/email/email.service';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import {
  Subscription,
  SubscriptionDocument,
} from './schema/subscription.schema';
import { CreateSubscriptionDto } from './types/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    private schedulerService: SchedulerService,
    private emailService: EmailService,
  ) {}

  async createSubscription(subscription: CreateSubscriptionDto) {
    const token = this.generateToken(subscription.email, subscription.city);
    const exists = await this.subscriptionModel.findOne({
      token,
    });
    if (exists) throw new ConflictException('Email already subscribed');

    const newSubscription = new this.subscriptionModel({
      ...subscription,
      token,
    }).save();

    await this.emailService.sendConfirmationEmail(subscription.email, token);
    return newSubscription;
  }

  async confirm(token: string) {
    const subscription = await this.subscriptionModel.findOne({ token });
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (subscription.confirmed)
      throw new ConflictException('Already confirmed');
    subscription.confirmed = true;
    const saved = await subscription.save();

    this.schedulerService.scheduleSubscription(saved);
    return saved;
  }

  async unsubscribe(token: string) {
    const subscription = await this.subscriptionModel.findOne({ token });
    if (!subscription) throw new NotFoundException('Token not found');

    this.schedulerService.removeSubscription(subscription);

    return this.subscriptionModel.findByIdAndDelete(subscription._id);
  }

  private generateToken(email: string, city: string): string {
    return crypto
      .createHmac('sha256', process.env.SECRET_TOKEN!)
      .update(`${email.toLowerCase()}:${city.toLowerCase()}`)
      .digest('hex');
  }
}
