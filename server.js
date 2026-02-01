const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static('frontend'));

// API Key - from environment variable
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.error('❌ ERROR: API key not set in environment variables');
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Cyber Image Generator API is running'
    });
});

// Generate image
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "black-forest-labs/flux.2-klein-4b",
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

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/frontend/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
