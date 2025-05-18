import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly appUrl: string;

  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    this.appUrl = `${this.config.get<string>('HOST')}:${this.config.get<string>('PORT')}`;
  }

  async sendConfirmationEmail(email: string, city: string, token: string) {
    const url = `${this.appUrl}/api/confirm/${token}`;
    await this.mailer.sendMail({
      to: email,
      subject: 'Please confirm your Weather API subscription',
      template: './confirmation',
      context: {
        url,
        city,
      },
    });
  }

  async sendWeatherUpdateEmail(
    email: string,
    city: string,
    temperature: number,
    humidity: number,
    description: string,
    token: string,
  ) {
    const unsubscribeUrl = `${this.appUrl}/api/unsubscribe/${token}`;
    await this.mailer.sendMail({
      to: email,
      subject: `Weather update for ${city}`,
      template: './weather-update',
      context: {
        city,
        temperature,
        humidity,
        description,
        timestamp: new Date().toLocaleString(),
        unsubscribeUrl,
      },
    });
  }
}
