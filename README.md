# ERS Mobile App

A React Native mobile application for the Employee Reservation System (ERS).

## Features

- User authentication (login/register)
- View available slots
- Make reservations
- View and manage your reservations
- Chat with AI assistant
- User profile management

## Tech Stack

- React Native with Expo
- React Navigation for routing
- Axios for API requests
- Secure storage for auth tokens
- Context API for state management

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, Mac only)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Update the API configuration in `src/config/api.js` to point to your backend server
4. Start the development server:
   ```
   npm start
   ```
5. Follow the instructions in the terminal to launch the app on your preferred platform

### Testing on Physical Devices

1. Install the Expo Go app on your device
2. Scan the QR code shown in the terminal after running `npm start`
3. The app will open in Expo Go

## Project Structure

```
ers-app/
├── src/
│   ├── assets/          # Images, fonts, and other static assets
│   ├── components/      # Reusable UI components
│   ├── config/          # Configuration files
│   ├── navigation/      # Navigation setup
│   ├── screens/         # App screens
│   ├── services/        # API services
│   └── utils/           # Utility functions and helpers
├── App.js               # Entry point
└── package.json         # Dependencies
```

## Building for Production

### Android

```
expo build:android
```

### iOS

```
expo build:ios
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 