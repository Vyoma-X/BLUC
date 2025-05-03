const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
dotenv.config();

const app = express();

app.use(express.json())

app.get('/',(req,res)=>{
    res.status(200).send("Hello!")
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    mongoose.connect(process.env.MONGO_URI).then(()=>console.log("mongodb connected"));
    console.log(`Server is running on PORT: ${PORT}`);
})