# Intelagent Studios Dashboard - Setup Instructions

## Quick Start

1. **Navigate to the dashboard directory:**
   ```bash
   cd nextjs-dashboard
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the dashboard:**
   Open http://localhost:3000 in your browser

## Login Instructions

### For Master Admin Access:
- **License Key:** `INTL-MSTR-ADMN-PASS`
- **Domain:** Enter any domain (e.g., "admin.com")

### For Customer Access:
- Use an actual license key from your database
- Domain must match the one stored in the database for that license

## Testing the Database Connection

Run the test script to verify database connectivity:
```bash
node scripts/test-db.js
```

## Important Notes

1. **Database Connection:** The current `.env.local` file is configured with the Railway internal database URL. This will only work when deployed to Railway. For local development, you'll need to:
   - Either set up a local PostgreSQL database
   - Or use Railway's external database URL (you can get this from Railway dashboard)

2. **Real-time Updates:** The dashboard includes WebSocket support for real-time data updates. The server automatically broadcasts updates every 5 seconds.

3. **PDF Export:** Click the "Export PDF" button in the dashboard header to generate and download a PDF report of the current dashboard view.

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. **For local development**, update `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/your_db_name
   ```

2. **For Railway external access**, get the external URL from Railway:
   - Go to your Railway project
   - Click on the PostgreSQL service
   - Copy the "Public Network" connection string
   - Update `.env.local` with this URL

### Port Already in Use

If port 3000 is already in use, you can change it by:
1. Updating the port in `server.js`
2. Updating `NEXT_PUBLIC_WS_URL` in `.env.local`

### Authentication Issues

If login fails:
- Verify the license key exists in the database
- Check that the domain matches (for non-master users)
- Try the master admin credentials first to verify the system works

## Features Overview

- ✅ Dark theme professional UI
- ✅ Real-time data updates
- ✅ Master admin and customer access levels
- ✅ Interactive charts and statistics
- ✅ License management table
- ✅ PDF export functionality
- ✅ WebSocket integration
- ✅ Responsive design

## Next Steps

1. Test with the master admin credentials
2. Create some test data in your database
3. Explore the different tabs and features
4. Deploy to Railway for production use