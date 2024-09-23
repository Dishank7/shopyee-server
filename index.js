
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
require('dotenv').config();

const PORT = process.env.PORT || 4000
const JWT_SCERET = process.env.JWT_SCERET


app.use(express.json());
app.use(cors());

//data connection with MongoDB

mongoose.connect(process.env.MONGO_URI)

//API creation


app.get('/',(req,res)=>{
    res.send("Hello")
})

//Image storage engine

const storage = multer.diskStorage({
    destination:"./upload/images",
    filename:(req,file,cb)=>{
return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})


//Creating upload images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    
    res.json({
        success:1,
        image_url:`https://shopyee-server.onrender.com:${PORT}/images/${req.file.filename}`
    })

})

//Schema for Creating Products

const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true
    },
    old_price:{
        type:Number,
        required:true
    },
    date:{
        type:Date,
        default:Date.now(),
    },
    available:{
        type:Boolean,
        default:true
    },
})

app.post("/addproduct",async(req,res)=>{

   let products = await Product.find({});

   let id;
   if(products.length > 0){
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id =  last_product.id + 1;
   }

   else{
    id=1
   }

    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price
    });

    console.log(product);
    await product.save();

    res.json({
        success:true,
        name:req.body.name
    })
})

//Creating APi for Delete

app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id})

    res.json({
        success:true,
        name:req.body.name
    })
})

//Api for Get product
app.get('/allproduct', async (req,res)=>{
    let products = await Product.find({})
    res.send(products);
})


//Schema of User Model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,    
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object
    },
    date:{
        type:Date,
        default:Date.now,
    }
})


// Api for User Signup

app.post('/signup', async(req,res)=>{

     let check =  await Users.findOne({email:req.body.email});

     if(check){
        return res.status(400).json({success:false,errors:"User Already Exists"})
     }
     let cart = {};
     for(let i = 0; i < 300; i++){
        cart[i]=0
     }

     const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData: cart,
     })


     await user.save();

     const data = {
        user:{
            id:user.id
        }
     }
      
     const token = jwt.sign(data,JWT_SCERET);

     res.json({success:true,token})
 
})

// Api for User login

app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,JWT_SCERET);
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Invalid Credentials"})
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }
})

//creating api of newcollection data

app.get('/newcollection',async (req,res)=>{
     let products = await Product.find({});
     let newcollection = products.slice(1).slice(-8);
     res.send(newcollection);
})

app.get('/popularinwomen', async (req,res)=>{
     let products = await Product.find({category:"women"});
     let popular_in_women = products.slice(0,4);
     res.send(popular_in_women);
    }) 

// creating middelware to fetch user
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,JWT_SCERET);
            req.user = data.user;
            next();
        } catch (error) {
             res.status(401).send({errors:"Please authenticate using valid token"})
        }
    }
}

 // API for adding cart data
 
 app.post('/addtocart', fetchUser, async(req,res)=>{
     
    let userData = await Users.findOne({_id:req.user.id});

    userData.cartData[req.body.itemId]+=1

    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})

    res.send("Added")
 })

 // Api to remove cart data

app.post('/removefromcart',fetchUser,async(req,res)=>{
    let userData = await Users.findOne({_id:req.user.id});
   if(userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId]-=1

    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})

    res.send("removed")
})

app.post('/getcart', fetchUser, async(req,res)=>{
    console.log("getcart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(PORT,(err)=>{
    if(!err){
        console.log("Server Running on PORT"+ PORT)
    }
    else{
        console.log("Error:"+err)
    }
})