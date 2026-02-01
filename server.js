const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// API Key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

// Serve frontend files if they exist
app.use(express.static(path.join(__dirname, 'frontend')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Cyber Image Generator API is running',
        timestamp: new Date().toISOString()
    });
});

// Generate image
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, model } = req.body;
        
        console.log('Generating image for:', prompt.substring(0, 100));
        
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
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://cyber-image.onrender.com',
                'X-Title': 'Cyber Image Generator'
            }
        });
        
        const data = response.data;
        
        if (data.choices && data.choices[0].message.images) {
            const images = data.choices[0].message.images;
            
            res.json({
                success: true,
                images: images.map(img => ({ url: img.image_url.url })),
                prompt: prompt,
                model: model || "black-forest-labs/flux.2-klein-4b"
            });
        } else {
            res.status(500).json({ error: 'No image generated' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message 
        });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});
