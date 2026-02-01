const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Get API key from environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Validate API key on startup
if (!OPENROUTER_API_KEY) {
    console.error('❌ ERROR: OPENROUTER_API_KEY is not set in environment variables');
    console.error('Please set it in Render.com environment variables');
    process.exit(1);
}

console.log('✅ API Key loaded from environment variables');

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'Cyber Image Generator API',
        environment: process.env.NODE_ENV || 'development',
        // NEVER expose API key here
    });
});

// Generate image endpoint
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, model } = req.body;
        
        // Input validation
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Valid prompt is required' 
            });
        }
        
        if (prompt.length > 1000) {
            return res.status(400).json({ 
                success: false,
                error: 'Prompt too long (max 1000 characters)' 
            });
        }
        
        console.log(`📸 Generating image - Prompt: ${prompt.substring(0, 50)}...`);
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: model || "black-forest-labs/flux.2-klein-4b",
            messages: [{
                role: "user",
                content: prompt
            }],
            modalities: ["image"]
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = response.data;
        
        if (data.choices && data.choices[0].message.images) {
            const images = data.choices[0].message.images;
            
            res.json({
                success: true,
                images: images.map(img => ({ url: img.image_url.url })),
                prompt: prompt
            });
            
            console.log('✅ Image generated successfully');
        } else {
            throw new Error('No images generated');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Don't expose API errors to client
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate image. Please try again.'
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Cyber Image Generator API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            generate: '/api/generate-image'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 Cyber Image Generator API
    ==============================
    ✅ Server running on port: ${PORT}
    ✅ Environment: ${process.env.NODE_ENV || 'development'}
    ✅ Health check: http://localhost:${PORT}/api/health
    ==============================
    `);
});
