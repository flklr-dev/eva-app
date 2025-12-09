# EVA Web Admin Dashboard

Admin dashboard for managing push notification subscribers and sending notifications to mobile app users.

## Quick Start

```bash
npm start
```

Dashboard will be available at: **http://localhost:5000**

## Features

- 📊 View total subscriber count
- 📋 List all subscribed users with details
- 📤 Send push notifications to all subscribers
- 🔄 Auto-refresh every 30 seconds
- 🔐 Secure authentication (uses existing user login)

## Configuration

Create `.env` file:

```env
WEB_PORT=5000
API_URL=http://localhost:3000
```

## Usage

1. **Login:** Use your EVA app user credentials
2. **View Subscribers:** See all users who clicked "Notify Me"
3. **Send Notification:**
   - Enter title
   - Enter message
   - Click "Send to All Subscribers"
   - Users receive push notification on their devices

## Tech Stack

- **Express** - Web server
- **EJS** - Template engine
- **Vanilla JavaScript** - Frontend
- **CSS** - Styling

## File Structure

```
web/
├── server.js              # Main server
├── package.json           # Dependencies
├── .env                   # Configuration
├── views/
│   ├── login.ejs         # Login page
│   ├── dashboard.ejs     # Main dashboard
│   └── index.ejs         # Landing page
└── public/
    └── styles.css        # Styles
```

## Dependencies

```json
{
  "express": "^4.18.2",
  "ejs": "^3.1.9",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1"
}
```

## Notes

- Requires backend API running on port 3000
- Authentication uses JWT tokens from backend
- Admin role checking should be added for production
