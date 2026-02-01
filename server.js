const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// SIMPLIFIED CORS - ALLOW ALL ORIGINS
const corsOptions = {
    origin: function (origin, callback) {
        // Production mein specific origins, development mein sab allow
        if (process.env.NODE_ENV === 'production') {
            const allowedOrigins = [
                'https://faiz786-lada.github.io',  // ✅ Aapka GitHub Pages
                'https://image-ai-p2uj.onrender.com',  // ✅ Aapka Render backend
                'http://localhost:10000',
                'http://localhost:3000',
                'http://127.0.0.1:10000',
                'http://127.0.0.1:3000'
            ];
            
            // GitHub Pages subdomains allow karein
            if (!origin || 
                allowedOrigins.includes(origin) || 
                origin.includes('localhost') || 
                origin.includes('127.0.0.1') ||
                origin.includes('.github.io') ||  // ✅ Sab GitHub Pages allow
                origin.includes('render.com')) {
                console.log('✅ Allowed origin:', origin);
                callback(null, true);
            } else {
                console.log('❌ Blocked origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // Development - sab allow
            console.log('🚧 Development - Allowing origin:', origin);
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400
};

// Apply CORS
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Check if frontend folder exists
const frontendPath = path.join(__dirname, 'frontend');
const indexPath = path.join(frontendPath, 'index.html');

if (fs.existsSync(indexPath)) {
    // Serve from frontend folder
    app.use(express.static(frontendPath));
    console.log('✅ Serving from /frontend folder');
} else {
    // Serve from root (for Render deployment)
    app.use(express.static(__dirname));
    console.log('⚠️  Frontend folder not found, serving from root');
}

// Health check - ALWAYS ALLOW CORS
app.get('/api/health', (req, res) => {
    // Force CORS headers
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    res.json({ 
        status: 'ok',
        service: 'Cyber Image Generator',
        timestamp: new Date().toISOString(),
        cors: 'enabled',
        allowed_origins: ['https://faiz786-lada.github.io', 'https://image-ai-p2uj.onrender.com'],
        origin: req.headers.origin || 'unknown'
    });
});

// CORS test endpoint
app.get('/api/test-cors', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.json({
        message: 'CORS test successful!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Generate image
app.post('/api/generate-image', async (req, res) => {
    try {
        // Set CORS headers
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        const { prompt, model } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                success: false,
                error: 'Prompt is required' 
            });
        }
        
        console.log('📸 Generating image for:', prompt.substring(0, 100));
        console.log('🌐 Origin:', req.headers.origin);
        console.log('🤖 Model:', model || 'default');
        
        // Use the provided model or default
        const imageModel = model || "black-forest-labs/flux.2-klein-4b";
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: imageModel,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image"]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': req.headers.origin || 'https://image-ai-p2uj.onrender.com',
                'X-Title': 'Cyber Image Generator'
            },
            timeout: 45000
        });
        
        const images = response.data.choices[0].message.images;
        
        if (!images || images.length === 0) {
            throw new Error('No image generated by AI');
        }
        
        res.json({
            success: true,
            images: images.map(img => ({ 
                url: img.image_url.url,
                size: img.image_url.size 
            })),
            prompt: prompt,
            model: imageModel,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error generating image:', error.message);
        
        // Set CORS headers for error response too
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        let errorMessage = 'Failed to generate image';
        if (error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ 
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    // Set CORS headers for HTML responses too
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    
    // Try frontend folder first, then root
    const possiblePaths = [
        path.join(__dirname, 'frontend', 'index.html'),
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'public', 'index.html')
    ];
    
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    
    // If no index.html found, send simple response
    const origin = req.headers.origin || 'Direct Access';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cyber Image Generator API</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 20px; 
                    background: #0f172a;
                    color: #ffffff;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .container {
                    background: #1e293b;
                    padding: 30px;
                    border-radius: 10px;
                    margin-top: 50px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                h1 { color: #3b82f6; margin-bottom: 10px; }
                h2 { color: #60a5fa; margin-top: 30px; }
                .status { 
                    background: #10b981; 
                    color: white; 
                    padding: 10px 20px; 
                    border-radius: 5px; 
                    display: inline-block;
                    margin: 20px 0;
                }
                .endpoint {
                    background: #334155;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 10px 0;
                    text-align: left;
                }
                .method { 
                    background: #3b82f6; 
                    color: white; 
                    padding: 3px 8px; 
                    border-radius: 3px;
                    font-weight: bold;
                    margin-right: 10px;
                }
                .url { color: #60a5fa; font-family: monospace; }
                .origin { 
                    background: rgba(16, 163, 127, 0.2); 
                    padding: 8px 15px; 
                    border-radius: 5px; 
                    margin: 10px 0;
                }
                a { color: #60a5fa; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Cyber Image Generator API</h1>
                <div class="status">✅ Backend Server Running</div>
                
                <div class="origin" id="originInfo">
                    <strong>Current Origin:</strong> ${origin}
                </div>
                
                <p>This is the backend API server. Frontend is hosted separately.</p>
                
                <h2>📡 API Endpoints</h2>
                
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/health</span>
                    <p>Health check and CORS status</p>
                </div>
                
                <div class="endpoint">
                    <span class="method">POST</span>
                    <span class="url">/api/generate-image</span>
                    <p>Generate images with AI</p>
                    <small>Requires: {"prompt": "your image description"}</small>
                </div>
                
                <div class="endpoint">
                    <span class="method">GET</span>
                    <span class="url">/api/test-cors</span>
                    <p>Test CORS configuration</p>
                </div>
                
                <h2>🌐 Allowed Origins</h2>
                <ul style="text-align: left;">
                    <li>https://faiz786-lada.github.io</li>
                    <li>https://image-ai-p2uj.onrender.com</li>
                    <li>http://localhost:10000</li>
                    <li>http://localhost:3000</li>
                    <li>All .github.io subdomains</li>
                </ul>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155;">
                    <p>Made with ❤️ by Team Cybersecurity</p>
                    <p><a href="https://github.com/faiz786-lada" target="_blank">GitHub Repository</a></p>
                </div>
            </div>
            
            <script>
                // Test API connection
                fetch('/api/health')
                    .then(res => res.json())
                    .then(data => {
                        console.log('API Health:', data);
                        const originDiv = document.getElementById('originInfo');
                        if (originDiv) {
                            originDiv.innerHTML += '<br><small>API Status: ' + data.status + '</small>';
                        }
                    })
                    .catch(err => console.error('Health check failed:', err));
            </script>
        </body>
        </html>
    `;
    
    res.send(html);
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
    🚀 Cyber Image Generator (CORS FIXED)
    ====================================
    Port: ${PORT}
    Mode: ${process.env.NODE_ENV || 'development'}
    URL: https://image-ai-p2uj.onrender.com
    CORS: ✅ GitHub Pages Enabled
    ====================================
    `);
    
    console.log('\n✅ Allowed Origins:');
    console.log('   • https://faiz786-lada.github.io');
    console.log('   • https://image-ai-p2uj.onrender.com');
    console.log('   • All .github.io domains');
    console.log('   • Localhost (development)\n');
});

// Handle shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
