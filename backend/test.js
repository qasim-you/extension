/**
 * Quick smoke test for the LinkedIn Groq AI Reply backend
 * Run: node test.js  (requires server to be running on port 3001)
 */

async function test() {
    const BASE = 'http://localhost:3001';

    console.log('\n🧪 LinkedIn Groq AI Reply - Backend Smoke Tests\n');

    // Test 1: Health check
    try {
        const res = await fetch(`${BASE}/health`);
        const data = await res.json();
        console.log('✅ Health check:', data.status, `(${data.model})`);
    } catch (e) {
        console.log('❌ Health check FAILED — is the server running?', e.message);
        process.exit(1);
    }

    // Test 2: Generate reply — Professional tone, Question type
    try {
        const res = await fetch(`${BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment: 'What\'s the best way to grow a personal brand on LinkedIn in 2024?',
                tone: 'professional',
                commentType: 'question',
            }),
        });
        const data = await res.json();
        if (!data.reply) throw new Error('No reply returned');
        console.log('\n✅ Generate (Professional / Question):');
        console.log(`   "${data.reply}"`);
        console.log(`   Tokens: ${data.tokens} | Latency: ${data.latencyMs}ms`);
    } catch (e) {
        console.log('❌ Generate test FAILED:', e.message);
    }

    // Test 3: Generate reply — Founder Mode, Congratulation type
    try {
        const res = await fetch(`${BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment: 'Just closed our seed round of $2M 🎉 So grateful for this journey!',
                tone: 'founder',
                commentType: 'congratulation',
            }),
        });
        const data = await res.json();
        if (!data.reply) throw new Error('No reply returned');
        console.log('\n✅ Generate (Founder Mode / Congratulation):');
        console.log(`   "${data.reply}"`);
    } catch (e) {
        console.log('❌ Generate test FAILED:', e.message);
    }

    // Test 4: Validation — too short
    try {
        const res = await fetch(`${BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: 'Hi', tone: 'professional' }),
        });
        const data = await res.json();
        if (res.status === 400 && data.error) {
            console.log('\n✅ Validation (too short) correctly rejected:', data.error);
        } else {
            console.log('❌ Validation test failed — should have returned 400');
        }
    } catch (e) {
        console.log('❌ Validation test FAILED:', e.message);
    }

    // Test 5: 404 route
    try {
        const res = await fetch(`${BASE}/unknown-route`);
        const data = await res.json();
        if (res.status === 404) {
            console.log('\n✅ 404 handler works:', data.error);
        }
    } catch (e) {
        console.log('❌ 404 test FAILED:', e.message);
    }

    console.log('\n✨ Smoke tests complete!\n');
}

test();
