const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Login GET
router.get('/login', (req, res) => {
    res.render('login', { 
        title: 'Login', 
        user: req.session.user || null, 
        error: null 
    });
});

// Login POST
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !(await user.comparePassword(password))) {
            return res.render('login', { 
                title: 'Login', 
                user: req.session.user || null, 
                error: 'Invalid email or password' 
            });
        }

        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email
        };

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('login', { 
            title: 'Login', 
            user: req.session.user || null, 
            error: 'Login failed. Try again.' 
        });
    }
});

// Register GET
router.get('/register', (req, res) => {
    res.render('register', { 
        title: 'Register', 
        user: req.session.user || null, 
        errors: [], 
        userData: {} 
    });
});

// Register POST
router.post('/register', [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('register', { 
            title: 'Register', 
            user: req.session.user || null, 
            errors: errors.array(), 
            userData: req.body 
        });
    }

    try {
        const existingUser = await User.findOne({
            $or: [
                { username: req.body.username.toLowerCase() },
                { email: req.body.email.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.render('register', {
                title: 'Register',
                user: req.session.user || null,
                errors: [{ msg: 'Username or email already exists' }],
                userData: req.body
            });
        }

        const user = new User({
            username: req.body.username.toLowerCase(),
            email: req.body.email.toLowerCase(),
            password: req.body.password
        });

        await user.save();

        req.session.user = {
            id: user._id.toString(),
            username: user.username,
            email: user.email
        };

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.render('register', {
            title: 'Register',
            user: req.session.user || null,
            errors: [{ msg: 'Registration failed. Try again.' }],
            userData: req.body
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/login');
});

module.exports = router;