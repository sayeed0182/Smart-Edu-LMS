const express = require('express');
const axios   = require('axios');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are EduBot, a friendly and knowledgeable AI study assistant for SMART-EDU, 
an education management system for engineering college students in India.
You help students with:
- Academic subjects (Data Structures, OS, DBMS, Networks, Maths, etc.)
- Understanding their grades and GPA on a 10-point scale
- Attendance advice (minimum 75% required)
- Exam preparation and study tips
- Explaining concepts step-by-step
Keep answers clear, concise and encouraging. Use simple language.`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured.' });
    }

    // Build conversation contents
    const contents = [];

    // Add chat history
    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add current message with system context prepended to first user message
    const userText = contents.length === 0
      ? `${SYSTEM_PROMPT}\n\nStudent: ${message}`
      : message;

    contents.push({ role: 'user', parts: [{ text: userText }] });

    const response = await axios.post(GEMINI_URL, { contents }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(500).json({ success: false, message: 'No response from Gemini.' });
    }

    res.json({ success: true, reply });

  } catch (err) {
    console.error('Gemini API Error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.error?.message || 'AI service error.',
    });
  }
});

// POST /api/ai/analyze — student performance analysis
router.post('/analyze', async (req, res) => {
  try {
    const { studentData } = req.body;

    if (!studentData) {
      return res.status(400).json({ success: false, message: 'Student data is required.' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured.' });
    }

    const prompt = `Analyze the following student's academic performance and provide actionable insights:\n\n` +
      `Name: ${studentData.name}\n` +
      `Attendance: ${studentData.attendance}%\n` +
      `Subjects: ${JSON.stringify(studentData.marks)}\n\n` +
      `Provide: 1) Overall assessment 2) Weak areas 3) Specific study recommendations 4) Motivation. Keep it under 200 words.`;

    const response = await axios.post(GEMINI_URL, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const analysis = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      return res.status(500).json({ success: false, message: 'No analysis from Gemini.' });
    }

    res.json({ success: true, analysis });

  } catch (err) {
    console.error('Gemini Analyze Error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.error?.message || 'AI analysis error.',
    });
  }
});

module.exports = router;