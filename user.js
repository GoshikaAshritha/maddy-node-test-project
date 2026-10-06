const express = require('express');

const router = express.Router();
const User = require('../models/user');

//get all the users data
router.get('/', async (req, res) => {
    try{
    const userData = await User.find();
    res.status(200).json({ data : userData});
    } catch(err){
        res.status(500).json({message: err.message});
    }
})

//get single user data
router.get('/:id', async (req,res) => {
 try{
    const user = await User.findById(req.params.id);
 if(user) {
    res.json({ data: user});
 } else{
    res.status(404).json({message: 'User not found'});
 }
} catch(err) {
    res.status(500).json({message: 'Error occurred while querying'});
}
})

//to create a user
router.post('/new', async (req, res) => {
    console.log(req.body);
    const newUser = new User({ userName: req.body.userName});
    await newUser.save();
    //user is created in db
 res.status(200).json({message: 'A new user got created'});
})

//to update a user details
router.patch('/update/:id', async (req, res) => {
    const user = await User.findById(req.params.id);
    //user is updated in db
    user.userName = req.body.userName;
    await user.save();
 res.status(200).json({message: 'User details updated'}); 
})

//to delete a user 
router.delete('/delete/:id', async (req, res) => {
    //user is deleted in db
    await User.findOneAndDelete(req.params.id);
 res.status(200).json({message: 'User  deleted'}); 
})


module.exports = router