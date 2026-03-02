# AQI Project Documentation

## Overview
This project combines a frontend and backend solution for monitoring air quality using a map-based interface. The frontend is built with Vite, React, and Tailwind CSS, and the backend is powered by Express, MongoDB, Socket.IO, Server-Sent Events (SSE), and utilizes Groq/OpenAI and Gemini for enhanced functionalities.

## Project Structure
- **Frontend**: Located in `BreadthSafe-MapBasedAqi/`
- **Backend**: Located in `BreadthSafe-MapBasedAqi/backend/`

## Setup Instructions
### Prerequisites
- Node.js (>= 14.0.0)
- MongoDB (local or cloud)

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd BreadthSafe-MapBasedAqi
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file and set the required environment variables (see the Environment Variables section).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Environment Variables
- `MONGODB_URI`: Connection string for MongoDB.
- `PORT`: Port on which the server will run (default is 5000).
- `API_KEY`: Your API key for connecting to external services (if required).

## Running Instructions
1. Ensure MongoDB is running if using a local instance.
2. Run the frontend and backend servers as described in the setup instructions.
3. Access the application in your browser at `http://localhost:3000` (frontend).

## Key API Endpoints
- **`GET /api/air-quality`**: Fetches current air quality data.  
- **`POST /api/alerts`**: Create an alert for significant changes in air quality.  
- **`GET /api/timeline`**: Retrieve historical air quality data.

## Conclusion
This documentation provides a comprehensive overview for setting up and running the AQI project. For further information or contribution guidelines, please refer to the repository's issues or discussion sections.