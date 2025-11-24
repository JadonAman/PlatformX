const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const appRoutes = require('./routes/app');

// Initialize Express app
const app = express();

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 5000;

// Routes
app.use('/api', appRoutes);




// Middleware
app.use(cors());
app.use(express.json());

// Mongo DB Connection
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
