const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

// Initialize Express app
const app = express();

// Global middleware (must come BEFORE platformRouter)
app.use(cors());
app.use(express.json());

// PlatformX modules
const { platformRouter } = require('./middleware/platformRouter');
const { lazyLoader } = require('./middleware/lazyLoader');
const { appForwarder } = require('./middleware/appForwarder');

app.use(platformRouter);
app.use(lazyLoader);
app.use(appForwarder);

// Platform API routes (dashboard/backend routes)
const appRoutes = require('./routes/app');
app.use('/api', appRoutes);

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
