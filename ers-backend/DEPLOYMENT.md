# Deployment Guide for Render

## Prerequisites

1. **Supabase Database**: Ensure your Supabase project is set up and the database schema is deployed
2. **OpenAI API Key**: Required for AI chat functionality
3. **Email Configuration**: Gmail account with app password for password reset emails
4. **GitHub Repository**: Your code should be in a GitHub repository

## Environment Variables

Set these environment variables in your Render service dashboard:

### Required Variables:
- `NODE_ENV=production`
- `PORT` (automatically set by Render)
- `SUPABASE_URL=your_supabase_project_url`
- `SUPABASE_KEY=your_supabase_anon_key`
- `JWT_SECRET=your_secure_random_string`
- `OPENAI_API_KEY=your_openai_api_key`

### Optional Variables:
- `EMAIL_USER=your_gmail_address@gmail.com`
- `EMAIL_PASSWORD=your_gmail_app_password`
- `FRONTEND_URL=https://your-frontend-app.render.com`
- `DEBUG_AI_LOGS=false`

## Deployment Steps

### Option 1: Using Render Dashboard

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your backend

2. **Configure Service**:
   - **Name**: `ers-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `cd ers-backend && npm install`
   - **Start Command**: `cd ers-backend && npm start`
   - **Plan**: Free (or upgrade as needed)

3. **Set Environment Variables**:
   - In the service settings, add all the environment variables listed above
   - Make sure to use your actual values (not the placeholder text)

4. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically deploy your application

### Option 2: Using render.yaml (Infrastructure as Code)

1. **Use the provided render.yaml**:
   - The `render.yaml` file in the root directory defines your service
   - Commit and push the file to your repository

2. **Connect via Blueprint**:
   - In Render Dashboard, click "New +" → "Blueprint"
   - Connect your repository and select the render.yaml file
   - Add environment variables manually in the dashboard

## Post-Deployment

1. **Test the API**:
   - Your API will be available at `https://your-service-name.onrender.com`
   - Test the health endpoint: `GET /api/health`

2. **Update Frontend Configuration**:
   - Update your frontend to point to the new backend URL
   - Update CORS settings by setting `FRONTEND_URL` environment variable

3. **Database Setup**:
   - Ensure your Supabase database has the correct schema
   - Run any necessary data migrations

## Troubleshooting

- **Build Failures**: Check that all dependencies are listed in package.json
- **Environment Variables**: Verify all required environment variables are set
- **Database Connection**: Check Supabase URL and key are correct
- **CORS Issues**: Ensure FRONTEND_URL matches your frontend domain

## Monitoring

- Use Render's built-in logs to monitor your application
- Set up health checks and monitoring as needed
- Monitor your Supabase usage and limits 