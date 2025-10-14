# Watt - An Energy Management System

## What is Watt
Watt is an attempt to get a better understanding of how a production-grade microservice project works.

## Structure
At the moment, there are 3 services each with its own db instance, a reverse proxy + api gateway and a rabbitmq instance (some of them are still missing, will be added in due time).

## Technology
Mainly Rust + Axum. Everything is containarized using Docker.

## How to run
1. Install Docker and make sure it runs
2. Clone the project
3. Create a .env file (will add here, later, the envs that are needed)
4. Run `docker compose up --build` and wait until its done (hopefully no errors)
5. Run `docker compose ps` to make sure that all the stuff is running (you can also look in the Docker app in the Containers sections)
6. Enjoy.

## Disclaimer
At the moment, there is no web interface. To test it out, use Postman.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
