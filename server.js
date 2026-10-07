require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const uri = process.env.MONGODB_URI;
const User = require('./models/user.js');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');



const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true}))
app.set("view engine", "ejs");   //setting the views
app.use(cookieParser());

//import mongoose
const mongoose = require('mongoose');
//connect with db
mongoose.connect(uri)

const db = mongoose.connection;

db.once('open', () => {
    console.log('successfully connected to db');
    console.log('collections:', Object.keys(db.collections));
})
 
db.on('error', (error) => {
    console.log(error);
})
app.get('/', (req, res) => {
    const {token} = req.cookies;
    const tokenData = jwt.verify(token, process.env.JWT_SECRET_KEY);
    if(tokenData.type == 'user') {
        res.render('home');
    } else{
        res.redirect('/signin');
    }
    res.render('home');
})

app.get('/signin', (req, res) => {
    res.render('signin');
})

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/signup', async (req, res) => {
    const {Name: name, email, password: plainTextPassword} = req.body;
    const salt = await bcrypt.genSalt(10);

    const encryptedPassword = await bcrypt.hashSync(plainTextPassword, salt);
    try{
        await User.create({
            name,
            email,
            password: encryptedPassword

        });
        res.redirect('/signin');
    }
    catch(error){
        console.log(error);
    }
})

app.post('/signin', async (req, res) => {
    const {email, password} = req.body
    
    const userObj = await User.findOne({email});
    if(!userObj){
        res.send({error: "user doesn't exist", status:404});

    }

    try{
    if(bcrypt.compare(password, userObj.password)){
        //creating JWT token
        const token = jwt.sign({
            userId: userObj._id, email: email, type: 'user'
        }, process.env.JWT_SECRET_KEY, {expiresIn: '2h'});
        res.cookie('token', token, {maxAge: 2*60*60*1000});
        res.redirect('/');
    }
} catch (error) {
    console.error(error);
    return res.status(500).send('Unable to create account');
}
})


const userRouter = require('./routes/user');
app.use('/users', userRouter)



app.listen(5000);
console.log('server is listening on 5000');
