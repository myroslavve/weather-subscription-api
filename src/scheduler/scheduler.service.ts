import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
} from 'src/subscription/schema/subscription.schema';
import { SubscriptionFrequency } from 'src/types';
import { EmailService } from '../email/email.service';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private frequencyStrategy: Record<SubscriptionFrequency, string>;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly emailService: EmailService,
    private readonly weatherService: WeatherService,
  ) {
    this.frequencyStrategy = {
      [SubscriptionFrequency.HOURLY]: '0 * * * *', // every hour
      [SubscriptionFrequency.DAILY]: '0 9 * * *', // every day at 9am
    };
  }

  async onModuleInit() {
    const subs = await this.subscriptionModel.find({ confirmed: true });
    subs.forEach((sub) => this.scheduleSubscription(sub));
  }

  scheduleSubscription(subscription: SubscriptionDocument) {
    const jobName = subscription._id.toString();

    if (this.schedulerRegistry.getCronJobs().has(jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    const cronTime = this.frequencyStrategy[subscription.frequency];

    const job = new CronJob(cronTime, async () => {
      const weather = await this.weatherService.getWeather(subscription.city);
      await this.emailService.sendWeatherUpdateEmail(
        subscription.email,
        subscription.city,
        weather.temperature,
        weather.humidity,
        weather.description,
        subscription.token,
      );
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }

  removeSubscription(subscription: SubscriptionDocument) {
    const jobName = subscription._id.toString();
    if (this.schedulerRegistry.getCronJobs().has(jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }
}
