export type Weather = {
  temperature: number;
  humidity: number;
  description: string;
};

export enum SubscriptionFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
}

// Weather API
export type WeatherApiResponse = {
  current: {
    temp_c: number;
    humidity: number;
    condition: {
      text: string;
    };
  };
};

export type WeatherApiError = {
  error: {
    code: number;
    message: string;
  };
};
