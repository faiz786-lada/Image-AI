const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'Cyber Image Generator',
        timestamp: new Date().toISOString()
    });
});

// Generate image
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        console.log('Generating image for:', prompt.substring(0, 100));
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "black-forest-labs/flux.2-klein-4b",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image"]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const images = response.data.choices[0].message.images;
        
        res.json({
            success: true,
            images: images.map(img => ({ url: img.image_url.url })),
            prompt: prompt
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate image'
        });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
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
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cyber Image Generator</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                h1 { color: #2563eb; }
            </style>
        </head>
        <body>
            <h1>🚀 Cyber Image Generator API</h1>
            <p>Backend is running! Frontend files not found.</p>
            <p>API is available at: <code>/api/generate-image</code></p>
            <p>Health check: <a href="/api/health">/api/health</a></p>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 Cyber Image Generator
    ========================
    Port: ${PORT}
    Mode: ${process.env.NODE_ENV || 'development'}
    URL: http://localhost:${PORT}
    ========================
    `);
});
