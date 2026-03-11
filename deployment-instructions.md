# Watchtower Deployment Instructions

These instructions explain how to run the `NRMMobileAPP` on a new laptop alongside Watchtower. Watchtower will automatically restart the application whenever a new Docker image is built and pushed by your GitHub Actions.

## Prerequisites
1. **Docker Desktop** must be installed and running.
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)

## Steps to Deploy

1. Open a terminal (PowerShell or Command Prompt).
2. Clone this repository (if not already cloned):
   ```bash
   git clone https://github.com/hadiht/NRMMobileAPP.git
   ```
3. Navigate into the repository directory:
   ```bash
   cd NRMMobileAPP
   ```
4. Start the application and Watchtower using Docker Compose:
   ```bash
   docker compose up -d
   ```

## What Happens Next?
- Docker will download your latest image (`hadiht/nrmmobileapp:latest`) and the Watchtower image.
- The `nrm-app` container will start and be available on `http://localhost:8080`.
- The `watchtower` container will start in the background. It is configured to check your Docker registry every 5 minutes (`300` seconds).
- Whenever a new image is pushed to `hadiht/nrmmobileapp:latest`, Watchtower will detect it, pull the new image, gracefully stop the old `nrm-app` container, and start a new one with the same configuration.

## Checking the Logs

If you need to see what Watchtower is doing, run:
```bash
docker logs watchtower
```
