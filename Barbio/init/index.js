const mongoose = require("mongoose")
const Shop =require("../models/shop.js")
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust2"

main().then(()=>{
    console.log("connectede to DB")
    })
    .catch((err)=>{
        console.log(err)
    })
    

async function main() {
    await mongoose.connect(MONGO_URL)
}
const shops = await Shop.find();
for (let shop of shops) {
  shop.dailySlots = shop.dailySlots.map(ds => ({
    date: new Date(ds.date).toISOString().split("T")[0],
    slots: ds.slots
  }));
  await shop.save();
}
