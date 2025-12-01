# PC Builder Frontend

A modern, responsive web interface for browsing and searching PC parts from your MongoDB database.

## ✨ Features

- **Modern UI Design** - Clean, gradient-based design with smooth animations
- **Responsive Layout** - Works perfectly on desktop, tablet, and mobile devices
- **Category Navigation** - Browse parts by component type (CPU, GPU, Motherboard, etc.)
- **Advanced Search** - Search by part name, manufacturer, or brand
- **Smart Filtering** - Filter by manufacturer and price range
- **Real-time Updates** - Dynamic content loading and filtering
- **API Integration** - Connects directly to your MongoDB database

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npm run setup-db
npm run seed-data
```

### 3. Start the Frontend Server
```bash
npm start
```

### 4. Open in Browser
Navigate to `http://localhost:3000`

## 🛠️ Development

### Start Development Server
```bash
npm run dev
```
This will start the server with nodemon for automatic reloading.

### Frontend Files Structure
```
public/
├── index.html      # Main HTML structure
├── styles.css      # CSS styling and responsive design
└── script.js       # JavaScript functionality and API calls
```

### Backend API Endpoints
- `GET /api/parts` - Get all parts with optional filters
- `GET /api/parts/:category` - Get parts by category
- `GET /api/manufacturers` - Get all manufacturers
- `GET /api/stats` - Get database statistics

## 🎨 UI Components

### Navigation
- **Category Tabs** - Switch between different PC part categories
- **Search Bar** - Search across all parts
- **Filter Controls** - Filter by manufacturer and price range

### Part Cards
Each part is displayed in an attractive card showing:
- Part name and price
- Manufacturer and brand
- Key specifications
- Feature tags
- Hover effects and animations

### Responsive Design
- **Desktop** - Multi-column grid layout
- **Tablet** - Adjusted spacing and sizing
- **Mobile** - Single-column layout with optimized touch targets

## 🔧 Customization

### Styling
Edit `public/styles.css` to customize:
- Color scheme and gradients
- Typography and spacing
- Card layouts and animations
- Responsive breakpoints

### Functionality
Modify `public/script.js` to add:
- New filter options
- Additional search capabilities
- Custom part display logic
- Enhanced interactions

### Data Display
Update the `getPartSpecs()` method to show different specifications for each part category.

## 📱 Browser Support

- **Chrome** 80+
- **Firefox** 75+
- **Safari** 13+
- **Edge** 80+

## 🚨 Troubleshooting

### Frontend Not Loading
1. Check if the server is running (`npm start`)
2. Verify MongoDB connection
3. Check browser console for errors

### API Errors
1. Ensure database is properly seeded
2. Check server logs for connection issues
3. Verify API endpoints are accessible

### Styling Issues
1. Clear browser cache
2. Check CSS file loading
3. Verify responsive breakpoints

## 🔗 Integration

### With Your Database
The frontend automatically connects to your MongoDB database through the Express server. Make sure to:
1. Set up your `.env` file with MongoDB connection details
2. Run the database setup and seeding scripts
3. Ensure the server can connect to MongoDB

### Adding New Parts
1. Add parts to your database using the seeding script
2. The frontend will automatically display new parts
3. Update the `getPartSpecs()` method if adding new part types

## 📈 Performance

- **Lazy Loading** - Parts are loaded on demand
- **Efficient Filtering** - Client-side filtering for instant results
- **Optimized Queries** - Database queries are optimized with proper indexes
- **Responsive Images** - Optimized for different screen sizes

## 🎯 Future Enhancements

- [ ] Part comparison tool
- [ ] Build compatibility checker
- [ ] Price tracking and alerts
- [ ] User accounts and saved builds
- [ ] Advanced filtering options
- [ ] Export functionality
- [ ] Dark mode toggle

---

**Happy PC Building! 🖥️✨**
