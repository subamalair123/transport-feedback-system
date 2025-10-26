<<<<<<< HEAD
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Azure SQL Database Configuration
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Create connection pool
let poolPromise;

async function getConnection() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✅ Connected to Azure SQL Database');
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed:', err);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
}

// Initialize connection
getConnection();

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const pool = await getConnection();
        await pool.request().query('SELECT 1 as num');
        res.json({ 
            success: true, 
            message: 'Server and database connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection error',
            error: error.message
        });
    }
});

// Get form data (routes and categories)
app.get('/api/form-data', async (req, res) => {
    try {
        const pool = await getConnection();
        
        const routesResult = await pool.request()
            .query('SELECT * FROM routes WHERE IsActive = 1 ORDER BY RouteName');
        
        const categoriesResult = await pool.request()
            .query('SELECT * FROM categories WHERE IsActive = 1 ORDER BY CategoryName');
        
        res.json({
            success: true,
            routes: routesResult.recordset,
            categories: categoriesResult.recordset
        });
    } catch (error) {
        console.error('Error fetching form data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch form data'
        });
    }
});

// Submit feedback - FIXED VERSION
app.post('/api/feedback', async (req, res) => {
    console.log('📝 Feedback submission received');
    
    try {
        const {
            name, email, phone, userType, selectedRoute,
            category, rating, feedback, suggestions
        } = req.body;

        // Validation
        if (!name || !email || !userType || !selectedRoute || !category || !rating || !feedback) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const pool = await getConnection();
        
        // FIXED: Split into INSERT and SELECT to avoid trigger conflict
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || null)
            .input('userType', sql.NVarChar, userType)
            .input('routeName', sql.NVarChar, selectedRoute)
            .input('categoryName', sql.NVarChar, category)
            .input('rating', sql.Int, rating)
            .input('feedbackText', sql.NVarChar, feedback)
            .input('suggestions', sql.NVarChar, suggestions || null)
            .query(`
                INSERT INTO feedback (Name, Email, Phone, UserType, RouteName, CategoryName, Rating, FeedbackText, Suggestions)
                VALUES (@name, @email, @phone, @userType, @routeName, @categoryName, @rating, @feedbackText, @suggestions)
            `);
        
        // Get the ID of the inserted row
        const result = await pool.request()
            .query('SELECT SCOPE_IDENTITY() as FeedbackID');
        
        const feedbackId = result.recordset[0].FeedbackID;
        
        console.log('✅ Feedback saved with ID:', feedbackId);

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: feedbackId
        });
    } catch (error) {
        console.error('❌ Error submitting feedback:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
});

// Get feedback with pagination
app.get('/api/feedback', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const category = req.query.category;
        const offset = (page - 1) * pageSize;

        const pool = await getConnection();
        
        let whereClause = '';
        if (category) {
            whereClause = `WHERE CategoryName = @category`;
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM feedback ${whereClause}`;
        const countRequest = pool.request();
        if (category) countRequest.input('category', sql.NVarChar, category);
        const countResult = await countRequest.query(countQuery);
        const totalCount = countResult.recordset[0].total;

        // Get paginated data
        const dataQuery = `
            SELECT * FROM feedback ${whereClause}
            ORDER BY SubmittedAt DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY
        `;
        const dataRequest = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize);
        if (category) dataRequest.input('category', sql.NVarChar, category);
        const dataResult = await dataRequest.query(dataQuery);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            success: true,
            data: dataResult.recordset,
            page,
            pageSize,
            totalPages,
            totalCount
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback'
        });
    }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const pool = await getConnection();

        // Total feedback
        const totalResult = await pool.request()
            .query('SELECT COUNT(*) as total FROM feedback');
        const totalFeedback = totalResult.recordset[0].total;

        // Average rating
        const avgResult = await pool.request()
            .query('SELECT AVG(CAST(Rating AS FLOAT)) as avgRating FROM feedback');
        const avgRating = parseFloat(avgResult.recordset[0].avgRating || 0).toFixed(1);

        // Recent feedback
        const recentResult = await pool.request()
            .query(`SELECT COUNT(*) as recent FROM feedback 
                    WHERE SubmittedAt >= DATEADD(day, -7, GETDATE())`);
        const recentFeedback = recentResult.recordset[0].recent;

        // Category breakdown
        const categoryResult = await pool.request()
            .query(`SELECT CategoryName, COUNT(*) as count, 
                    AVG(CAST(Rating AS FLOAT)) as avgRating 
                    FROM feedback GROUP BY CategoryName`);

        // Route breakdown
        const routeResult = await pool.request()
            .query(`SELECT RouteName, COUNT(*) as count, 
                    AVG(CAST(Rating AS FLOAT)) as avgRating 
                    FROM feedback GROUP BY RouteName`);

        res.json({
            success: true,
            analytics: {
                totalFeedback,
                avgRating,
                recentFeedback,
                categoryData: categoryResult.recordset,
                routeData: routeResult.recordset
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
});

// Submit emergency report - FIXED VERSION
app.post('/api/emergency', async (req, res) => {
    console.log('🚨 Emergency report received');
    
    try {
        const { name, contact, issueType, location, details } = req.body;

        if (!name || !contact || !issueType || !location || !details) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const pool = await getConnection();
        
        // FIXED: Split INSERT and SELECT
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('contact', sql.NVarChar, contact)
            .input('issueType', sql.NVarChar, issueType)
            .input('location', sql.NVarChar, location)
            .input('details', sql.NVarChar, details)
            .query(`
                INSERT INTO emergency_reports (Name, Contact, IssueType, Location, Details)
                VALUES (@name, @contact, @issueType, @location, @details)
            `);
        
        // Get the ID
        const result = await pool.request()
            .query('SELECT SCOPE_IDENTITY() as ReportID');
        
        const reportId = `EM-${result.recordset[0].ReportID}`;
        
        console.log('✅ Emergency report saved:', reportId);

        res.json({
            success: true,
            message: 'Emergency report submitted successfully',
            reportId
        });
    } catch (error) {
        console.error('Error submitting emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit emergency report'
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️ Shutting down server...');
    if (poolPromise) {
        const pool = await poolPromise;
        await pool.close();
    }
    process.exit(0);
=======
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Azure SQL Database Configuration
const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Create connection pool
let poolPromise;

async function getConnection() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig)
            .then(pool => {
                console.log('✅ Connected to Azure SQL Database');
                return pool;
            })
            .catch(err => {
                console.error('❌ Database connection failed:', err);
                poolPromise = null;
                throw err;
            });
    }
    return poolPromise;
}

// Initialize connection
getConnection();

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const pool = await getConnection();
        await pool.request().query('SELECT 1 as num');
        res.json({ 
            success: true, 
            message: 'Server and database connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection error',
            error: error.message
        });
    }
});

// Get form data (routes and categories)
app.get('/api/form-data', async (req, res) => {
    try {
        const pool = await getConnection();
        
        const routesResult = await pool.request()
            .query('SELECT * FROM routes WHERE IsActive = 1 ORDER BY RouteName');
        
        const categoriesResult = await pool.request()
            .query('SELECT * FROM categories WHERE IsActive = 1 ORDER BY CategoryName');
        
        res.json({
            success: true,
            routes: routesResult.recordset,
            categories: categoriesResult.recordset
        });
    } catch (error) {
        console.error('Error fetching form data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch form data'
        });
    }
});

// Submit feedback - FIXED VERSION
app.post('/api/feedback', async (req, res) => {
    console.log('📝 Feedback submission received');
    
    try {
        const {
            name, email, phone, userType, selectedRoute,
            category, rating, feedback, suggestions
        } = req.body;

        // Validation
        if (!name || !email || !userType || !selectedRoute || !category || !rating || !feedback) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const pool = await getConnection();
        
        // FIXED: Split into INSERT and SELECT to avoid trigger conflict
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('phone', sql.NVarChar, phone || null)
            .input('userType', sql.NVarChar, userType)
            .input('routeName', sql.NVarChar, selectedRoute)
            .input('categoryName', sql.NVarChar, category)
            .input('rating', sql.Int, rating)
            .input('feedbackText', sql.NVarChar, feedback)
            .input('suggestions', sql.NVarChar, suggestions || null)
            .query(`
                INSERT INTO feedback (Name, Email, Phone, UserType, RouteName, CategoryName, Rating, FeedbackText, Suggestions)
                VALUES (@name, @email, @phone, @userType, @routeName, @categoryName, @rating, @feedbackText, @suggestions)
            `);
        
        // Get the ID of the inserted row
        const result = await pool.request()
            .query('SELECT SCOPE_IDENTITY() as FeedbackID');
        
        const feedbackId = result.recordset[0].FeedbackID;
        
        console.log('✅ Feedback saved with ID:', feedbackId);

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: feedbackId
        });
    } catch (error) {
        console.error('❌ Error submitting feedback:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
});

// Get feedback with pagination
app.get('/api/feedback', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const category = req.query.category;
        const offset = (page - 1) * pageSize;

        const pool = await getConnection();
        
        let whereClause = '';
        if (category) {
            whereClause = `WHERE CategoryName = @category`;
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM feedback ${whereClause}`;
        const countRequest = pool.request();
        if (category) countRequest.input('category', sql.NVarChar, category);
        const countResult = await countRequest.query(countQuery);
        const totalCount = countResult.recordset[0].total;

        // Get paginated data
        const dataQuery = `
            SELECT * FROM feedback ${whereClause}
            ORDER BY SubmittedAt DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY
        `;
        const dataRequest = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize);
        if (category) dataRequest.input('category', sql.NVarChar, category);
        const dataResult = await dataRequest.query(dataQuery);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            success: true,
            data: dataResult.recordset,
            page,
            pageSize,
            totalPages,
            totalCount
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback'
        });
    }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const pool = await getConnection();

        // Total feedback
        const totalResult = await pool.request()
            .query('SELECT COUNT(*) as total FROM feedback');
        const totalFeedback = totalResult.recordset[0].total;

        // Average rating
        const avgResult = await pool.request()
            .query('SELECT AVG(CAST(Rating AS FLOAT)) as avgRating FROM feedback');
        const avgRating = parseFloat(avgResult.recordset[0].avgRating || 0).toFixed(1);

        // Recent feedback
        const recentResult = await pool.request()
            .query(`SELECT COUNT(*) as recent FROM feedback 
                    WHERE SubmittedAt >= DATEADD(day, -7, GETDATE())`);
        const recentFeedback = recentResult.recordset[0].recent;

        // Category breakdown
        const categoryResult = await pool.request()
            .query(`SELECT CategoryName, COUNT(*) as count, 
                    AVG(CAST(Rating AS FLOAT)) as avgRating 
                    FROM feedback GROUP BY CategoryName`);

        // Route breakdown
        const routeResult = await pool.request()
            .query(`SELECT RouteName, COUNT(*) as count, 
                    AVG(CAST(Rating AS FLOAT)) as avgRating 
                    FROM feedback GROUP BY RouteName`);

        res.json({
            success: true,
            analytics: {
                totalFeedback,
                avgRating,
                recentFeedback,
                categoryData: categoryResult.recordset,
                routeData: routeResult.recordset
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics'
        });
    }
});

// Submit emergency report - FIXED VERSION
app.post('/api/emergency', async (req, res) => {
    console.log('🚨 Emergency report received');
    
    try {
        const { name, contact, issueType, location, details } = req.body;

        if (!name || !contact || !issueType || !location || !details) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const pool = await getConnection();
        
        // FIXED: Split INSERT and SELECT
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('contact', sql.NVarChar, contact)
            .input('issueType', sql.NVarChar, issueType)
            .input('location', sql.NVarChar, location)
            .input('details', sql.NVarChar, details)
            .query(`
                INSERT INTO emergency_reports (Name, Contact, IssueType, Location, Details)
                VALUES (@name, @contact, @issueType, @location, @details)
            `);
        
        // Get the ID
        const result = await pool.request()
            .query('SELECT SCOPE_IDENTITY() as ReportID');
        
        const reportId = `EM-${result.recordset[0].ReportID}`;
        
        console.log('✅ Emergency report saved:', reportId);

        res.json({
            success: true,
            message: 'Emergency report submitted successfully',
            reportId
        });
    } catch (error) {
        console.error('Error submitting emergency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit emergency report'
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️ Shutting down server...');
    if (poolPromise) {
        const pool = await poolPromise;
        await pool.close();
    }
    process.exit(0);
>>>>>>> a3ab75a711ea6b9fc4aff52012b283739e7f76c4
});