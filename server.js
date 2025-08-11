const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Master key from environment
const MASTER_KEY = process.env.MASTER_LICENSE_KEY;

// Custom product configuration
const customProducts = {
    'custom-analytics': {
        table: 'custom_analytics_data',
        name: 'Custom Analytics',
        statsQuery: `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT user_id) as unique_users,
                MAX(created_at) as last_activity
            FROM custom_analytics_data
            WHERE license_key = $1
        `
    },
    // Add more custom products here
};

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Validate dashboard access
app.post('/api/validate-dashboard-access', async (req, res) => {
    const { licenseKey, domain } = req.body;
    
    try {
        // Check if it's the master key
        if (licenseKey === MASTER_KEY) {
            // Create master token
            const token = jwt.sign(
                {
                    licenseKey,
                    isMaster: true,
                    domain: 'ALL_DOMAINS'
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            return res.json({ 
                valid: true, 
                token,
                isMaster: true 
            });
        }
        
        // Regular license validation
        const result = await pool.query(
            `SELECT * FROM licenses 
             WHERE license_key = $1 
             AND status = 'active'`,
            [licenseKey]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ valid: false, error: 'Invalid license key' });
        }
        
        const license = result.rows[0];
        
        // Verify domain matches
        const domainCheck = await pool.query(
            `SELECT DISTINCT domain 
             FROM chatbot_logs 
             WHERE license_key = $1 
             AND LOWER(domain) = LOWER($2) 
             LIMIT 1`,
            [licenseKey, domain]
        );
        
        if (domainCheck.rows.length === 0) {
            return res.status(401).json({ valid: false, error: 'Domain not found for this license' });
        }
        
        // Create token
        const token = jwt.sign(
            {
                licenseKey,
                domain,
                email: license.email,
                isMaster: false
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            valid: true, 
            token,
            isMaster: false 
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ valid: false, error: 'Server error' });
    }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// Get dashboard data - adapts based on user type
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
    const { domain, product } = req.query;
    const { isMaster, licenseKey } = req.user;
    
    try {
        let stats, conversations, domains, licenses, products;
        
        if (isMaster) {
            // Get all products first
            products = await pool.query(`
                SELECT DISTINCT 
                    product_type,
                    COUNT(DISTINCT license_key) as license_count,
                    COUNT(DISTINCT email) as customer_count
                FROM licenses
                WHERE status = 'active'
                GROUP BY product_type
            `);
            
            // Master sees everything - filter by product if specified
            if (product === 'chatbot' || !product) {
                // Chatbot specific stats
                stats = await pool.query(`
                    SELECT 
                        COUNT(DISTINCT cl.conversation_id) as total_conversations,
                        COUNT(DISTINCT cl.user_id) as unique_users,
                        COUNT(DISTINCT cl.domain) as total_domains,
                        COUNT(DISTINCT l.license_key) as total_licenses,
                        COUNT(DISTINCT CASE 
                            WHEN l.created_at >= NOW() - INTERVAL '30 days' 
                            THEN l.license_key 
                        END) as new_customers_month,
                        AVG(CASE 
                            WHEN cl.role = 'assistant' 
                            THEN EXTRACT(EPOCH FROM cl.created_at - lag(cl.created_at) OVER (PARTITION BY cl.conversation_id ORDER BY cl.created_at))
                        END) as avg_response_time,
                        SUM(CASE WHEN l.subscription_id IS NOT NULL THEN 1 ELSE 0 END) as active_subscriptions,
                        SUM(CAST(REGEXP_REPLACE(l.purchase_amount, '[^0-9.]', '', 'g') AS NUMERIC)) as total_revenue
                    FROM chatbot_logs cl
                    LEFT JOIN licenses l ON cl.license_key = l.license_key
                    WHERE cl.created_at >= NOW() - INTERVAL '30 days'
                    ${domain ? 'AND cl.domain = $1' : ''}
                `, domain ? [domain] : []);
                
                // Get chatbot conversations
                conversations = await pool.query(`
                    SELECT 
                        cl.conversation_id,
                        cl.domain,
                        cl.user_id,
                        l.customer_name,
                        MIN(cl.created_at) as started_at,
                        MAX(cl.created_at) as last_message_at,
                        COUNT(*) as message_count,
                        bool_or(cl.role = 'assistant' AND cl.created_at > NOW() - INTERVAL '5 minutes') as is_active
                    FROM chatbot_logs cl
                    LEFT JOIN licenses l ON cl.license_key = l.license_key
                    WHERE cl.created_at >= NOW() - INTERVAL '7 days'
                    ${domain ? 'AND cl.domain = $1' : ''}
                    GROUP BY cl.conversation_id, cl.domain, cl.user_id, l.customer_name
                    ORDER BY MAX(cl.created_at) DESC
                    LIMIT 100
                `, domain ? [domain] : []);
            } else {
                // Other product stats (when you add them)
                stats = await pool.query(`
                    SELECT 
                        COUNT(DISTINCT license_key) as total_licenses,
                        COUNT(DISTINCT email) as total_customers,
                        SUM(CAST(REGEXP_REPLACE(purchase_amount, '[^0-9.]', '', 'g') AS NUMERIC)) as total_revenue
                    FROM licenses
                    WHERE product_type = $1
                    AND status = 'active'
                `, [product]);
            }
            
            // Get all licenses
            licenses = await pool.query(`
                SELECT 
                    l.license_key,
                    l.email,
                    l.customer_name,
                    l.product_type,
                    l.created_at,
                    l.subscription_status,
                    l.next_billing_date,
                    COALESCE(cl.domain, 'Not activated') as domain,
                    COUNT(DISTINCT cl.conversation_id) as usage_count
                FROM licenses l
                LEFT JOIN chatbot_logs cl ON l.license_key = cl.license_key
                WHERE l.status = 'active'
                ${product ? 'AND l.product_type = $1' : ''}
                GROUP BY l.license_key, l.email, l.customer_name, l.product_type, 
                         l.created_at, l.subscription_status, l.next_billing_date, cl.domain
                ORDER BY l.created_at DESC
                LIMIT 100
            `, product ? [product] : []);
            
            // Get domains list for filter
            domains = await pool.query(`
                SELECT DISTINCT 
                    cl.domain,
                    cl.license_key,
                    COUNT(DISTINCT cl.conversation_id) as conversation_count,
                    MAX(cl.created_at) as last_activity
                FROM chatbot_logs cl
                GROUP BY cl.domain, cl.license_key
                ORDER BY last_activity DESC
            `);
            
        } else {
            // Customer sees only their domain
            stats = await pool.query(`
                SELECT 
                    COUNT(DISTINCT conversation_id) as total_conversations,
                    COUNT(DISTINCT user_id) as unique_users,
                    1 as total_domains,
                    AVG(CASE 
                        WHEN role = 'assistant' 
                        THEN EXTRACT(EPOCH FROM created_at - lag(created_at) OVER (PARTITION BY conversation_id ORDER BY created_at))
                    END) as avg_response_time
                FROM chatbot_logs
                WHERE license_key = $1 
                AND domain = $2
                AND created_at >= NOW() - INTERVAL '30 days'
            `, [licenseKey, req.user.domain]);
            
            conversations = await pool.query(`
                SELECT 
                    conversation_id,
                    user_id,
                    MIN(created_at) as started_at,
                    MAX(created_at) as last_message_at,
                    COUNT(*) as message_count,
                    bool_or(role = 'assistant' AND created_at > NOW() - INTERVAL '5 minutes') as is_active
                FROM chatbot_logs
                WHERE license_key = $1 
                AND domain = $2
                AND created_at >= NOW() - INTERVAL '7 days'
                GROUP BY conversation_id, user_id
                ORDER BY MAX(created_at) DESC
                LIMIT 50
            `, [licenseKey, req.user.domain]);
            
            // Get customer's products
            products = await pool.query(`
                SELECT DISTINCT product_type
                FROM licenses
                WHERE email = $1
                AND status = 'active'
            `, [req.user.email]);
        }
        
        res.json({
            stats: stats.rows[0],
            conversations: conversations.rows,
            domains: domains ? domains.rows : null,
            licenses: licenses ? licenses.rows : null,
            products: products ? products.rows : null,
            isMaster
        });
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

// Get conversation messages
app.get('/api/conversations/:conversationId', authenticateToken, async (req, res) => {
    const { conversationId } = req.params;
    const { isMaster, licenseKey } = req.user;
    
    try {
        let query = `
            SELECT 
                role,
                content,
                created_at
            FROM chatbot_logs
            WHERE conversation_id = $1
        `;
        
        const params = [conversationId];
        
        // If not master, filter by license key
        if (!isMaster) {
            query += ' AND license_key = $2';
            params.push(licenseKey);
        }
        
        query += ' ORDER BY created_at ASC';
        
        const messages = await pool.query(query, params);
        
        res.json({ messages: messages.rows });
        
    } catch (error) {
        console.error('Conversation fetch error:', error);
        res.status(500).json({ error: 'Failed to load conversation' });
    }
});

// Export endpoint
app.get('/api/export', authenticateToken, async (req, res) => {
    const { format = 'csv', startDate, endDate } = req.query;
    const { isMaster, licenseKey, domain: userDomain } = req.user;
    
    try {
        let query = `
            SELECT 
                conversation_id,
                domain,
                user_id,
                role,
                content,
                created_at
            FROM chatbot_logs
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        if (!isMaster) {
            query += ` AND license_key = $${paramIndex++}`;
            params.push(licenseKey);
            query += ` AND domain = $${paramIndex++}`;
            params.push(userDomain);
        }
        
        if (startDate) {
            query += ` AND created_at >= $${paramIndex++}`;
            params.push(startDate);
        }
        
        if (endDate) {
            query += ` AND created_at <= $${paramIndex++}`;
            params.push(endDate);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const data = await pool.query(query, params);
        
        if (format === 'csv') {
            const csv = convertToCSV(data.rows);
            res.header('Content-Type', 'text/csv');
            res.attachment(`chatbot-export-${Date.now()}.csv`);
            res.send(csv);
        } else {
            res.json(data.rows);
        }
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// API endpoint for custom products
app.get('/api/custom-product/:productType', authenticateToken, async (req, res) => {
    const { productType } = req.params;
    const { isMaster, licenseKey } = req.user;
    
    const config = customProducts[productType];
    if (!config) {
        return res.status(404).json({ error: 'Product not found' });
    }
    
    try {
        // Get custom product data
        let dataQuery = `SELECT * FROM ${config.table} WHERE 1=1`;
        const params = [];
        
        if (!isMaster) {
            dataQuery += ' AND license_key = $1';
            params.push(licenseKey);
        }
        
        dataQuery += ' ORDER BY created_at DESC LIMIT 100';
        
        const data = await pool.query(dataQuery, params);
        const stats = await pool.query(config.statsQuery, params);
        
        res.json({
            productName: config.name,
            stats: stats.rows[0],
            data: data.rows
        });
        
    } catch (error) {
        console.error('Custom product error:', error);
        res.status(500).json({ error: 'Failed to load custom product data' });
    }
});

// Register custom product in licenses
app.post('/api/licenses/custom-product', authenticateToken, async (req, res) => {
    const { licenseKey, productType, customerEmail, tableName } = req.body;
    
    if (!req.user.isMaster) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    try {
        // Add to custom products config
        customProducts[productType] = {
            table: tableName,
            name: productType,
            statsQuery: `SELECT COUNT(*) as total_entries FROM ${tableName} WHERE license_key = $1`
        };
        
        // Create license entry
        await pool.query(`
            INSERT INTO licenses (
                license_key,
                email,
                product_type,
                status,
                created_at
            ) VALUES ($1, $2, $3, 'active', NOW())
        `, [licenseKey, customerEmail, productType]);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Custom product registration error:', error);
        res.status(500).json({ error: 'Failed to register custom product' });
    }
});

// Simple CSV converter
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ].join('\n');
    
    return csv;
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Dashboard server running on port ${PORT}`);
});