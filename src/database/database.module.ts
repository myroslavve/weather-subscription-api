import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Subscription,
  SubscriptionSchema,
} from 'src/subscription/schema/subscription.schema';
import { DatabaseMigrationService } from './database-migration.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [DatabaseMigrationService],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private readonly databaseMigrationService: DatabaseMigrationService,
  ) {}

  async onModuleInit() {
    await this.databaseMigrationService.runMigrations();
  }
}
