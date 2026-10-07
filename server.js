require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const User = require('./models/user.js');
const userRouter = require('./routes/user');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');

// Protected home page
app.get('/', (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/signin');
    }

    try {
        const tokenData = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY
        );

        if (tokenData.type !== 'user') {
            return res.redirect('/signin');
        }

        return res.render('home');
    } catch (error) {
        res.clearCookie('token', { path: '/' });
        return res.redirect('/signin');
    }
});

// Sign-in page
app.get('/signin', (req, res) => {
    return res.render('signin');
});

// Signup page
app.get('/signup', (req, res) => {
    return res.render('signup');
});

// Create an account
app.post('/signup', async (req, res) => {
    try {
        // "Name" must match the name attribute in your signup form.
        const { Name: name, email, password } = req.body;

        if (
            typeof name !== 'string' || !name.trim() ||
            typeof email !== 'string' || !email.trim() ||
            typeof password !== 'string' || !password
        ) {
            return res.status(400).send(
                'Name, email, and password are required'
            );
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).send('Email is already registered');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword
        });

        return res.redirect('/signin');
    } catch (error) {
        console.error('Signup failed:', error);

        if (error.code === 11000) {
            return res.status(409).send('Email is already registered');
        }

        return res.status(500).send('Unable to create account');
    }
});

// Sign in
app.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' || !email.trim() ||
            typeof password !== 'string' || !password
        ) {
            return res.status(400).send(
                'Email and password are required'
            );
        }

        const userObj = await User.findOne({ email });

        if (!userObj) {
            return res.status(401).send('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(
            password,
            userObj.password
        );

        if (!isMatch) {
            return res.status(401).send('Invalid email or password');
        }

        const token = jwt.sign(
            {
                userId: userObj._id,
                email: userObj.email,
                type: 'user'
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '2h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000,
            path: '/'
        });

        return res.redirect('/');
    } catch (error) {
        console.error('Sign-in failed:', error);
        return res.status(500).send('Unable to sign in');
    }
});

// User routes
app.use('/users', userRouter);

// Connect to MongoDB, then start the server
async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing');
        }

        if (!process.env.JWT_SECRET_KEY) {
            throw new Error('JWT_SECRET_KEY is missing');
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Successfully connected to MongoDB');

        app.listen(port, '0.0.0.0', () => {
            console.log(`Server is listening on port ${port}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();
