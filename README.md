# EduManage AI - Educational Management System

A modern, AI-powered educational management system built with React and Tailwind CSS.

## Features

### Student Dashboard
- 🎯 **QR Code Attendance** - Biometric-style scanning with GPS and face verification
- 🏆 **Gamification System** - Levels, XP, engagement scores, and attendance streaks
- 🤖 **AI Productivity Hub** - Personalized micro-learning tasks based on career goals
- 📊 **Activity Heatmap** - GitHub-style 12-week productivity visualization
- 🎓 **Career Path Onboarding** - Guided wizard to customize learning journey

### Faculty Analytics
- ⚠️ **Early Warning System** - Identify at-risk students with predictive scores
- 📈 **Class Performance Heatmap** - Visual attendance and completion metrics
- 📉 **6-Month Trend Analysis** - Track attendance and engagement over time
- 👥 **Student Insights** - Last active status and risk indicators

### Special Features
- 🌙 **Dark Mode** - "Focus Mode" for late-night study sessions
- 📱 **Fully Responsive** - Mobile-first design with Tailwind CSS
- ✨ **Smooth Animations** - Polished UI with transitions and effects
- 🎨 **Modern Design** - Distinctive EdTech aesthetic with gradient accents

## Tech Stack

- **React 18** - Modern React with Hooks
- **Tailwind CSS 3** - Utility-first styling
- **Recharts** - Beautiful, responsive charts
- **Lucide React** - Clean, modern icons
- **Google Fonts** - Inter & JetBrains Mono typography

## Getting Started

### Prerequisites
- Node.js 14+ and npm installed

### Installation

1. Navigate to the project directory:
```bash
cd edu-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
edu-management-system/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main application component
│   ├── index.js        # Entry point
│   └── index.css       # Global styles with Tailwind
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Customization

### Changing Colors
Edit `tailwind.config.js` to modify the color scheme:
```javascript
colors: {
  navy: {
    DEFAULT: '#1A2B3C',
    // Add your custom colors
  },
}
```

### Adding Features
The component is modular - you can easily add:
- Backend integration (MongoDB, PostgreSQL)
- State management (Redux, Context API)
- Routing (React Router)
- Real-time updates (WebSockets)
- Authentication (JWT, OAuth)

## Deployment

Build the production version:
```bash
npm run build
```

The optimized files will be in the `build/` directory, ready for deployment to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any static hosting service

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License - feel free to use this for educational or commercial projects!

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.
