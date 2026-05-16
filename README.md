# Google Calendar Shared Manager

This application allows multiple users to add events to a single shared Google Calendar.

## Prerequisites
- Docker and Docker Compose
- Google Cloud Project with Google Calendar API enabled
- OAuth 2.0 Client ID (Web Application) credentials

## Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Google Calendar API**.
3. Configure the **OAuth consent screen** (External).
4. Create **OAuth 2.0 Client IDs** for a "Web application".
   - Authorized redirect URIs: `http://localhost:5173` (or your production URL)
5. Download the JSON credentials, rename the file to `credentials.json`, and place it in the `server/` directory.

## How to Run
1. Start the application using Docker Compose:
   ```bash
   docker-compose up --build
   ```
2. Open `http://localhost:5173` in your browser.
3. Click "Authorize with Google" to link the shared account. This only needs to be done once (or when the token expires).
4. Once authorized, any user can add events to the calendar via the web interface.

## Project Structure
- `client/`: React + Vite frontend.
- `server/`: FastAPI backend.
- `docker-compose.yml`: Orchastrates both services.
