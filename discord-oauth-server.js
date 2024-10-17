const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

app.use(express.json());
app.use(express.static('public'));

const CLIENT_ID = '1295476827258753126';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'; // Replace with your actual client secret
const REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';

// In-memory user storage (replace with a database in a real application)
const users = {};

app.get('/auth/discord/callback', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'callback.html'));
});

app.post('/auth/discord/token', async (req, res) => {
    const { code } = req.body;
    
    if (code) {
        try {
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI,
                    scope: 'identify',
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            
            const tokenData = await tokenResponse.json();
            const userData = await fetchUserData(tokenData.access_token);
            
            // Store user data (use a database in a real application)
            users[userData.id] = { 
                ...userData, 
                accessToken: tokenData.access_token,
                ingameName: '',
                ingameRating: 0
            };
            
            res.json({ success: true, username: userData.username });
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            res.status(500).json({ success: false, message: 'An error occurred during authentication' });
        }
    } else {
        res.status(400).json({ success: false, message: 'No code provided' });
    }
});

app.post('/update-user-profile', (req, res) => {
    const { ingameName, ingameRating } = req.body;
    // In a real application, you would update the user's profile in the database
    // For this example, we'll just update the in-memory user object
    // Note: In a real app, you'd identify the user through a session or token
    const userId = Object.keys(users)[0]; // This is a hack for demonstration
    if (userId) {
        users[userId].ingameName = ingameName;
        users[userId].ingameRating = parseInt(ingameRating);
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'User not found' });
    }
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/user-profile', (req, res) => {
    // In a real application, you would fetch this data from a database
    // and identify the user through a session or token
    const userId = Object.keys(users)[0]; // This is a hack for demonstration
    if (userId) {
        const user = users[userId];
        res.json({
            ingameName: user.ingameName || "Not set",
            ingameRating: user.ingameRating || 0,
            squad: "Not Assigned" // You would determine this based on your game logic
        });
    } else {
        res.status(400).json({ success: false, message: 'User not found' });
    }
});

async function fetchUserData(accessToken) {
    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return userResponse.json();
}

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});