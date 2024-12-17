const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const userModel = require('./models/userModel');
const postModel = require('./models/postModel');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.get('/', (req, res)=>{
    res.render('index');
})

// Middleware to check if user is logged in
let isLoggedIn = (req, res, next) =>{
    if (req.cookies.token === "") res.redirect('/login');
    else{
        let data =  jwt.verify(req.cookies.token, "secretKey");
        req.user = data;
        next();
    }
}

//User created here
app.post('/create', (req, res)=>{
    let {username, name, email, password} = req.body;
    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(password, salt, async (err, hash)=>{
            let user = await userModel.create({
                username,
                name,
                email,
                password: hash
            })
            // res.send(user);
            let token = jwt.sign({email}, "secretKey");
            res.cookie("token", token);
            // res.send(user);
            res.redirect('/login');
        })
    })
})

//User login here
app.get('/login', (req, res)=>{
    res.render('login');
})

app.post('/login', async (req, res)=>{
    let {email, password} = req.body;
    let user = await userModel.findOne({email: email});// email se find kiya user
    if(!user) return res.send("User not found");
    bcrypt.compare(password, user.password, (err, result)=>{
        if(result){
            let token = jwt.sign({email:email, userid:user._id}, "secretKey");
            res.cookie("token", token);
            res.redirect('/profile');
        }
        else{
            res.send("Incorrect Password");
            res.redirect('/login');
        }
    })
})

//User logout here
app.get('/logout', (req, res)=>{
    res.cookie("token", "");
    res.redirect('/login');
})

//User profile here
app.get('/profile', isLoggedIn,async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate('posts'); //populate is used to get the data of the posts
    // console.log(user);
    // user.populate('posts')
    res.render('profile', {user}); // user is the data that we are sending to the profile.ejs
})

//post created here
app.post('/createpost', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email});
    let {content} = req.body
    let post = await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');

})

// like post here
app.get('/like/:id', isLoggedIn, async (req, res)=>{
    let post =  await postModel.findOne({_id:req.params.id}).populate('user');
    // console.log(req.user);
    if(post.likes.indexOf(req.user.userid ) === -1 ){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/profile'); 
})



//update post here
app.get('/edit/:id', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate('posts');
    let post = await postModel.findOne({_id:req.params.id}).populate('user');
    res.render('edit', {post, user});
})

app.post('/update/:id', isLoggedIn, async (req, res)=>{
    let {content} = req.body; 
    let post = await postModel.findOneAndUpdate({_id:req.params.id}, {content});
    res.redirect('/profile');
})


// delete post here
app.get('/delete/:id', isLoggedIn, async(req, res)=>{
    let post = await postModel.findOneAndDelete({_id:req.params.id});
    let user = await userModel.findOne({email: req.user.email});
    user.posts.splice(user.posts.indexOf(req.params.id), 1);
    await user.save();
    res.redirect('/profile');
})


app.listen(3000, ()=>{
    console.log('Server running on port 3000');
})