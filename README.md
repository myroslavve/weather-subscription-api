## Description

This is a simple weather API that allows you to get the weather for a specific city.

Deployed on AWS EC2 instance on http://weatherapi.myroslav.xyz

Technologies used:

- NestJS
- TypeScript
- Docker
- MongoDB
- Jest

## Project setup

Copy .env.example file to .env and edit it with your own values

```bash
$ docker compose up --build
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e
```
