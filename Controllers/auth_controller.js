const jwt = require('jsonwebtoken');
const User = require(`${__dirname}/../Models/user_model`);
const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const AppError = require(`${__dirname}/../utils/appErrors`);

// helper to create token
const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// send token + user
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    // remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

// Create User
exports.createUser = catchAsync(async (req, res, next) => {
    const { name, email, password, confirmPassword, role } = req.body;

    const newUser = await User.create({
        name,
        email,
        password,
        confirmPassword,
        role
    });

    newUser.password = undefined;

    res.status(201).json({
        status: 'success',
        data: {
        user: newUser
        }
    });
});

// Login
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1. check email & password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    // 2. find user & include password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password', 401));
    }

    // 3. send token
    createSendToken(user, 200, res);
});

// protect routes
exports.protect = catchAsync(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in!', 401));
    }

    // verify token
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return next(new AppError('Invalid or expired token', 401));
    }

    // find user
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('User no longer exists', 401));
    }

    req.user = currentUser;
    next();
});

// restrict roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission', 403));
        }
        next();
    };
};