# PayTR Callback Backend

Simple Express.js backend for handling PayTR payment callbacks.

## Features

- ✅ PayTR callback endpoint (`/paytr/callback`)
- ✅ Health check endpoint (`/health`)
- ✅ Proper logging of all callback data
- ✅ Returns "OK" response as required by PayTR
- ✅ CORS enabled
- ✅ Ready for Render.com deployment

## Endpoints

- `POST /paytr/callback` - PayTR payment callback
- `GET /paytr/callback` - PayTR payment callback (GET)
- `GET /health` - Health check
- `GET /` - Service info

## Deployment

1. Push to GitHub
2. Connect to Render.com
3. Deploy as Web Service
4. Use the generated URL in PayTR panel

## PayTR Integration

Use this URL in PayTR panel:
```
https://your-app-name.onrender.com/paytr/callback
```
