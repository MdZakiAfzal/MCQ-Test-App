const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require(`${__dirname}/../Models/user_model`);
const catchAsync = require(`${__dirname}/../utils/catchAsync`);
const AppError = require(`${__dirname}/../utils/appErrors`);
const { promisify } = require('util');
const sendEmail = require(`${__dirname}/../utils/email`);

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
    if(role === 'admin'){
        return next("You don't have permission to create an admin!");
    }
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
        return next(new AppError('You are not logged in. Please login to access this route', 401));
    }

    // verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // find user
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('User no longer exists', 401));
    }

    //check whether the user has chaneged their password currently and someone's trying to login with previous token
    if(currentUser.passwordChangedAfter(decoded.iat)){
        return next(new AppError('User has changed their password recently. Please login again', 401));
    };

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

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with that email address.', 404));
    }
    
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `Forgot your password? Please click this link to reset your password: ${resetURL} \nIf you did'nt forgot your password please ignore this email `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        });
    } catch (err) {
        // If sending email fails, undo the changes to the user document
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // Pass the AppError from sendEmail (or a new one) to the global handler
        return next(err); 
    }
})

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired and there is a user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Log the user in and send JWT
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //get user from collection
    const user = await User.findById(req.user.id).select('+password');
    //we will not write an if statement whether user found or not bcz it is comming from protect middleware, so if user was not there it would have given an error long before

    //Check if posted Current password is correct
    if(!(await user.correctPassword(req.body.currentPassword, user.password))){
        return next(new AppError('Incorrect current password', 401));
    }

    // if so update the password
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    await user.save();
    //user.findByIdAndUpdate(password); //you should never use it here because it won't trigger the document middlewares.

    //log the user in, send JWT
    createSendToken(user, 200, res);
});