import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SubscriptionFrequency } from 'src/types';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true, enum: SubscriptionFrequency })
  frequency: SubscriptionFrequency;

  @Prop({ default: false })
  confirmed: boolean;

  @Prop()
  token: string;

  @Prop({ default: 0 })
  migrationVersion: number;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
