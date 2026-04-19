# 🚀 Complete Setup Guide - EduManage AI

## Prerequisites

Before you begin, ensure you have:
- ✅ **Node.js 14+** installed ([Download here](https://nodejs.org))
- ✅ **npm** (comes with Node.js)
- ✅ A code editor (VS Code recommended)
- ✅ A modern web browser (Chrome, Firefox, Safari, or Edge)

## Step-by-Step Installation

### Step 1: Verify Your Environment

Open your terminal and run:

```bash
# Check Node.js version
node --version
# Should show v14.0.0 or higher

# Check npm version  
npm --version
# Should show 6.0.0 or higher
```

If these commands fail, install Node.js first.

### Step 2: Navigate to Project Directory

```bash
cd edu-management-system
```

### Step 3: Run Verification Script (Optional)

```bash
# On macOS/Linux
./verify.sh

# On Windows
bash verify.sh
```

### Step 4: Install Dependencies

This is the most important step! Run:

```bash
npm install
```

This will:
- Download all required packages (~200-300 MB)
- Take 2-5 minutes depending on your internet speed
- Create a `node_modules` folder

**If this fails**, try:
```bash
npm install --legacy-peer-deps
```

### Step 5: Start Development Server

```bash
npm start
```

This will:
- Compile the application
- Open http://localhost:3000 in your browser automatically
- Enable hot-reload (changes update instantly)

### Step 6: Explore the Application

You should see:
- ✨ Welcome onboarding wizard
- 🎓 Choose your career path
- 📱 Student dashboard with QR scanner
- 📊 Faculty analytics view
- 🌙 Dark mode toggle

## Common Installation Issues

### Issue: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org

### Issue: "Port 3000 already in use"
**Solution:** 
```bash
# Use different port
PORT=3001 npm start

# Or kill existing process
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

### Issue: "Module not found" errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: npm install takes forever or fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try with different registry
npm install --registry=https://registry.npmjs.org/

# Or use yarn instead
npm install -g yarn
yarn install
```

### Issue: Tailwind styles not loading
**Solution:** Make sure these files exist:
- `tailwind.config.js` ✓
- `postcss.config.js` ✓
- `src/index.css` with Tailwind directives ✓

## Project Scripts

After installation, you can use:

```bash
# Development (with hot reload)
npm start

# Production build
npm run build

# Run tests
npm test

# Analyze bundle size
npm run build --report
```

## Building for Production

When ready to deploy:

```bash
npm run build
```

This creates an optimized `build/` folder containing:
- Minified JavaScript
- Optimized CSS
- Compressed assets
- Ready for deployment

## Deployment Options

### Option 1: Netlify (Easiest)
1. Sign up at https://netlify.com
2. Drag and drop the `build/` folder
3. Done! 🎉

### Option 2: Vercel
```bash
npm install -g vercel
vercel
```

### Option 3: GitHub Pages
```bash
npm install --save gh-pages

# Add to package.json:
"homepage": "https://yourusername.github.io/edu-management-system",
"predeploy": "npm run build",
"deploy": "gh-pages -d build"

# Deploy
npm run deploy
```

### Option 4: Traditional Hosting
1. Run `npm run build`
2. Upload `build/` folder contents to your web server
3. Configure server to serve `index.html` for all routes

## Development Tips

### Hot Reload
When you save changes to any file, the browser automatically updates!

### Browser DevTools
- Press **F12** to open developer tools
- Use **Console** tab for debugging
- Use **React DevTools** extension for component inspection

### Code Organization
- Keep components in `src/App.js` or create separate files
- Add new features by creating new components
- Use React Hooks (useState, useEffect) for state management

### Styling
- Use Tailwind classes directly in JSX
- Customize colors in `tailwind.config.js`
- Add custom CSS in `src/index.css`

## Customization Guide

### Change Primary Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  navy: {
    DEFAULT: '#YOUR_COLOR',
  },
}
```

### Add New Features
1. Open `src/App.js`
2. Create a new component function
3. Add it to the appropriate view (Student/Faculty)
4. Save and see it live!

### Connect to Backend
```javascript
// Example: Fetch data from API
useEffect(() => {
  fetch('https://your-api.com/students')
    .then(res => res.json())
    .then(data => setStudents(data));
}, []);
```

## Troubleshooting Checklist

If something's not working:

- [ ] Node.js and npm installed?
- [ ] Ran `npm install` successfully?
- [ ] No errors in terminal?
- [ ] Browser console clear (F12)?
- [ ] Correct directory (has `package.json`)?
- [ ] Port 3000 available?
- [ ] Internet connection stable?

## Need More Help?

1. Check `TROUBLESHOOTING.md` for detailed solutions
2. Check `README.md` for feature documentation
3. Review `PROJECT_STRUCTURE.md` for file organization
4. Check the browser console for error messages
5. Search the error message on Google/Stack Overflow

## Quick Reference

```bash
# Common Commands
npm install              # Install dependencies
npm start               # Start dev server
npm run build           # Build for production
npm test                # Run tests

# Troubleshooting
npm cache clean --force # Clear npm cache
rm -rf node_modules     # Remove dependencies
npm install             # Reinstall everything

# Port Management
PORT=3001 npm start     # Use different port
lsof -ti:3000 | xargs kill -9  # Kill port 3000
```

## Success Checklist

You'll know everything is working when:

- ✅ `npm install` completes without errors
- ✅ `npm start` launches without errors
- ✅ Browser opens to http://localhost:3000
- ✅ You see the onboarding wizard
- ✅ Can toggle between Student/Faculty views
- ✅ Dark mode works
- ✅ Charts and animations render smoothly

## What's Next?

After successful setup:

1. **Explore Features** - Click through all the views
2. **Customize** - Change colors, add features
3. **Connect Backend** - Integrate with your API
4. **Deploy** - Share with the world!

---

**Ready to start?** Run `npm install` and then `npm start`! 🚀

If you encounter any issues, check `TROUBLESHOOTING.md` or the common issues section above.
