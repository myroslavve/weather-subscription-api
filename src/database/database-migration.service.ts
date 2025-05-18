import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
} from 'src/subscription/schema/subscription.schema';

@Injectable()
export class DatabaseMigrationService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async runMigrations() {
    try {
      await this.migration0();

      console.log('Migrations completed');
    } catch (e) {
      console.error(e);
    }
  }

  private async migration0() {
    const subscriptions = await this.subscriptionModel.find({
      migrationVersion: { $exists: false },
    });

    const ids = subscriptions.map((c) => c._id);

    await this.subscriptionModel.updateMany(
      { _id: { $in: ids } },
      { $set: { migrationVersion: 0 } },
    );
  }
}
