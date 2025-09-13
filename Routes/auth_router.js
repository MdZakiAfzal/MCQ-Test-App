const express = require('express');
const authController = require(`${__dirname}/../Controllers/auth_controller`);

const router = express.Router();

router.post('/login', authController.login);

router.post('/create-user', authController.protect, authController.restrictTo('admin', 'teacher'), authController.createUser);

// ONLY FOR one time use to create admin: remove after first use!
/*router.post('/signup-admin', async (req, res, next) => {
    const User = require(`${__dirname}/../Models/user_model`);
    const user = await User.create({
        name: "Md Zaki Afzal",
        email: "mdzakiahmed2005@gmail.com",
        password: "Afzal@3288",
        confirmPassword: "Afzal@3288",
        role: 'admin'
    });
    res.status(201).json({ status: 'success', data: user });
});*/

module.exports = router;