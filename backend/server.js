/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  LinkedIn Groq AI Auto Reply - Backend Server
 *  Node.js + Express proxy for Groq API calls
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Groq = require('groq-sdk');

// ─── Validate Environment ─────────────────────────────────────────────────────

if (!process.env.GROQ_API_KEY) {
    console.error('❌  GROQ_API_KEY is not set in .env file');
    process.exit(1);
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Groq Client ─────────────────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Security Middleware ──────────────────────────────────────────────────────

app.use(
    helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
    })
);

// CORS — only allow requests from Chrome extensions and localhost during dev
const allowedOrigins = [
    'https://www.linkedin.com',
    'chrome-extension://',        // pattern checked manually
    'http://localhost:3001',
    'http://127.0.0.1:3001',
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true); // Allow non-browser (postman etc.)
            if (
                origin.startsWith('chrome-extension://') ||
                origin.startsWith('http://localhost') ||
                origin.startsWith('http://127.0.0.1') ||
                origin === 'https://www.linkedin.com'
            ) {
                return callback(null, true);
            }
            callback(new Error('CORS policy: origin not allowed'));
        },
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Body parsing
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Global: 100 requests/15min per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Generate endpoint: 20 requests/5min per IP (more strict)
const generateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded for AI generation. Please wait a moment.' },
});

app.use(globalLimiter);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the tone description for the system prompt based on user selection
 */
function getToneInstruction(tone) {
    const tones = {
        professional: 'Use a formal, polished, and professional tone. Be concise and authoritative.',
        friendly: 'Use a warm, approachable, and genuine friendly tone. Sound like a real person.',
        founder: 'Use a bold, visionary "founder mode" tone. Sound like a startup founder who is confident, growth-oriented, and insightful.',
        motivational: 'Use an energetic, inspiring, and motivational tone. Uplift and encourage the reader.',
    };
    return tones[tone] || tones.professional;
}

/**
 * Build the auto-tone override based on detected comment type
 */
function getCommentTypeInstruction(commentType) {
    const instructions = {
        question: 'This is a QUESTION. Provide a helpful, knowledgeable answer.',
        congratulation: 'This is a CONGRATULATION post. Express genuine happiness and add value.',
        negative: 'This is a NEGATIVE comment. Be empathetic, constructive, and helpful. Do not be defensive.',
        opinion: 'This is an OPINION. Respectfully engage, add a unique perspective, and spark discussion.',
        general: 'This is a GENERAL comment. Engage thoughtfully.',
    };
    return instructions[commentType] || instructions.general;
}

/**
 * Validate comment text
 */
function validateComment(text) {
    if (!text || typeof text !== 'string') return 'Comment text is required.';
    const trimmed = text.trim();
    if (trimmed.length < 5) return 'Comment is too short to generate a meaningful reply.';
    if (trimmed.length > 2000) return 'Comment is too long (max 2000 characters).';
    return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Health check endpoint (polled by popup.js)
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'LinkedIn Groq AI Auto Reply',
        model: 'llama3-70b-8192',
        timestamp: new Date().toISOString(),
    });
});

/**
 * POST /generate
 * Main endpoint: receives comment text + tone, returns AI-generated reply
 *
 * Body: { comment: string, tone: string, commentType: string }
 * Response: { reply: string, commentType: string, tokens: number }
 */
app.post('/generate', generateLimiter, async (req, res) => {
    try {
        const { comment, tone = 'professional', commentType = 'general' } = req.body;

        // Validate
        const validationError = validateComment(comment);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        // Sanitize tone input
        const safeTone = ['professional', 'friendly', 'founder', 'motivational'].includes(tone)
            ? tone
            : 'professional';

        // Sanitize commentType
        const safeCommentType = ['question', 'congratulation', 'negative', 'opinion', 'general'].includes(commentType)
            ? commentType
            : 'general';

        const toneInstruction = getToneInstruction(safeTone);
        const commentInstruction = getCommentTypeInstruction(safeCommentType);

        // ── Build system prompt ─────────────────────────────────────────────────
        const systemPrompt = `You are a LinkedIn growth expert. Write concise, professional, engaging replies that increase engagement.

TONE INSTRUCTION: ${toneInstruction}
COMMENT TYPE: ${commentInstruction}

RULES:
- Maximum 3 sentences. Be impactful and concise.
- Do NOT use generic filler phrases like "Great post!" alone.
- Do NOT use excessive emojis (max 1-2 if appropriate).
- Do NOT include hashtags unless they're truly relevant.
- Sound authentic and human, not like a bot.
- Add genuine value or a thoughtful perspective.
- NEVER start with "I" as the first word.
- Output ONLY the reply text, nothing else.`;

        // ── Call Groq API ───────────────────────────────────────────────────────
        const startTime = Date.now();

        const completion = await groq.chat.completions.create({
            model: 'llama3-70b-8192',
            temperature: 0.7,
            max_tokens: 300,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: `LinkedIn comment to reply to:\n\n"${comment.trim()}"`,
                },
            ],
        });

        const reply = completion.choices[0]?.message?.content?.trim();

        if (!reply) {
            return res.status(500).json({ error: 'AI returned an empty response. Please try again.' });
        }

        const latencyMs = Date.now() - startTime;
        const tokensUsed = completion.usage?.total_tokens || 0;

        console.log(`✅ Reply generated | tone: ${safeTone} | type: ${safeCommentType} | tokens: ${tokensUsed} | ${latencyMs}ms`);

        return res.json({
            reply,
            commentType: safeCommentType,
            tone: safeTone,
            tokens: tokensUsed,
            latencyMs,
        });

    } catch (error) {
        console.error('❌ Groq API Error:', error);

        // Handle Groq-specific errors
        if (error?.status === 401) {
            return res.status(500).json({ error: 'Invalid API key. Please check your GROQ_API_KEY.' });
        }
        if (error?.status === 429) {
            return res.status(429).json({ error: 'Groq API rate limit exceeded. Please wait a moment.' });
        }
        if (error?.status === 503) {
            return res.status(503).json({ error: 'Groq API is temporarily unavailable. Try again soon.' });
        }

        return res.status(500).json({
            error: 'Failed to generate reply. Please try again.',
        });
    }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
    if (err.message?.startsWith('CORS')) {
        return res.status(403).json({ error: err.message });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   LinkedIn Groq AI Auto Reply - Backend Server       ║
  ║   Running on http://localhost:${PORT}                   ║
  ║   Model: llama3-70b-8192                             ║
  ║   Status: ✅ Ready                                   ║
  ╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
