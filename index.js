const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const stripe = require('stripe')('sk_test_51RMhY4FPz9j8wvfmUabVNcM90PJVHMWinObMJ3DlOZbWmAy2u4m5tbHO4wnho8Ln2WNVS69nbZAH2aCrpro4KLab004ltxm8B2');


//middleware
app.use(cors());
app.use(express.json());

// MONGODB CONNECT


const { MongoClient, ServerApiVersion , ObjectId} = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xprum35.mongodb.net/foogo?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const menuCollection = client.db("foogo").collection("menu");
    const cartCollection = client.db("foogo").collection("carts");
    const userCollection = client.db("foogo").collection("users");
    const bookingCollection = client.db("foogo").collection("booking");
    const postCollection = client.db("foogo").collection("posts");
    const paymentCollection = client.db("foogo").collection("payments");
    const reviewCollection = client.db("foogo").collection("reviews");
    const choosedeliverymanCollection = client.db("foogo").collection("choosedeliveryman");
    const rforfoodCollection = client.db("foogo").collection("rforfood");
    const cforfoodCollection = client.db("foogo").collection("cforfood");
    const restaurantTransactionCollection = client.db("foogo").collection("restaurant-transactions");
    

       //admin dashboard admi get number of user

    app.get('/admin-stats',  async (req, res) => {
    const users = await userCollection.estimatedDocumentCount();
    const menuItem = await menuCollection.estimatedDocumentCount();
    const order = await cartCollection.estimatedDocumentCount();

    const categoryCounts = await menuCollection.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            }
        }
    ]).toArray();

    const categoryProductCounts = categoryCounts.reduce((acc, category) => {
        acc[category._id] = category.count;
        return acc;
    }, {});

    const result = await cartCollection.aggregate([
        {
            $group: {
                _id: null,
                totalPrice: { $sum: '$price' }
            }
        }
    ]).toArray();

    const price = result.length > 0 ? result[0].totalPrice : 0;

    res.send({
        users,
        menuItem,
        order,
        price,
        categoryProductCounts
    });
});

    //----------------------**********USERS COLLECTION*****************------------------
    
    app.get('/users/all', async (req, res) => { 
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    //  get user by email
    app.get('/users', async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).send({ error: 'Email query parameter is required' });
  }

  try {
    const user = await userCollection.findOne({ email: email });
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).send({ error: 'Internal server error' });
  }
});
  /// update user Details
//   app.put('/users', async (req, res) => {
//   const email = req.query.email;
//   const { name, phone, location } = req.body;

//   if (!email) return res.status(400).send({ error: 'Email is required' });

//   const updateDoc = {
//     $set: {
//       ...(name && { name }),
//       ...(phone && { phone }),
//       ...(location && { location }),
//     }
//   };

//   try {
//     const result = await userCollection.updateOne({ email }, updateDoc, { upsert: true });
//     res.send(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ error: 'Failed to update user' });
//   }
// });

app.put('/users', async (req, res) => {
  const email = req.query.email;
  const {
    name,
    phone,
    location,
    wantTo,
    details,
    image
  } = req.body;

  if (!email) {
    return res.status(400).send({ error: '❌ Email is required' });
  }

  // Build dynamic update object only with provided fields
  const updateFields = {};
  if (name) updateFields.name = name;
  if (phone) updateFields.phone = phone;
  if (location) updateFields.location = location;
  if (wantTo) updateFields.wantTo = wantTo;
  if (details) updateFields.details = details;
  if (image) updateFields.image = image;

  const updateDoc = {
    $set: updateFields,
  };

  try {
    const result = await userCollection.updateOne(
      { email },
      updateDoc,
      { upsert: true } // insert if not exist
    );
    res.send(result);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send({ error: '❌ Failed to update user' });
  }
});


// post in user collection

    app.post('/users', async (req, res) => { 
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: "user already exists"})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

      app.get('/users/get/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // permision for admin
     app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      if (email !== req.params.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
     })
    //permision for restaurant
     app.get('/users/restaurant/:email', async (req, res) => {
      const email = req.params.email;

      if (email !== req.params.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let restaurant = false;
      if (user) {
        restaurant = user?.role === 'restaurant';
      }
      res.send({ restaurant });
       })
//fetch for delivery man
     app.get('/users/deliveryman/:email', async (req, res) => {
      const email = req.params.email;

      if (email !== req.params.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let deliveryman = false;
      if (user) {
        deliveryman = user?.role === 'deliveryman';
      }
      res.send({ deliveryman });
       })
       
    // user admin permission
    app.patch('/users/admin/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };

    // Fetch the current user data
    const user = await userCollection.findOne(filter);

    // Determine the new role based on the current role
    const newRole = user?.role === 'admin' ? 'user' : 'admin';

    const updateDoc = {
      $set: {
        role: newRole
      }
    };

    // Update the user role
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while updating the user role.', error });
  }
});

app.put('/users/admin/approved/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required in body' });
    }

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { role } };

    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result); // { matchedCount, modifiedCount, ... }
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});





    //--------------------------**********MENU COLLECTION*****************------------------
    //menu get by query email
      app.get('/menu/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const query = { restaurantemail: email };
    const result = await menuCollection.find(query).toArray();
    res.send(result);
  } catch (error) { 
    console.error("Error in GET /menu/:email:", error);
    res.status(500).send({ message: "Server error" });
  }
});
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    // insert single item in menu coolection
    app.post('/menu',  async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id;
        
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
    });


    app.get('/menu/book/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
    });
    //delete menu item from database by id
      app.delete('/menu/:id',  async (req, res) => {
      const id = req.params.id;
      const query ={ _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query);
      res.send(result);
      })
     
      
      app.patch('/menu/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
       }
         const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result);
      })
    //get menu items query by email
  
 
 

    //---------------------------------****************CARTS ITEMS*****************------------------
    // here all the carts item handled
    app.post('/carts', async (req, res) => {
       const cartItem = req.body
       const result = await cartCollection.insertOne(cartItem)
       res.send(result)

     })
     app.get('/carts', async (req, res) => {
       const email = req.query.email;
       if(!email){
         return res.send([])
       }
       const query = {email: email}
       const result = await cartCollection.find(query).toArray()
       res.send(result)
     }) 
     //DELETE CART FROM DATABASE ----------------------------------------
     app.delete('/carts/:id', async (req, res) => {
       const id = req.params.id;
       const query = {_id: new ObjectId(id)}
       const result = await cartCollection.deleteOne(query);
       res.send(result)
     })
    
    
    // ------******************* HERE ALL OF FROM BOOKING COLLECTION************-------
   app.post('/booking', async (req, res) => {
       const bookingItem = req.body
       const result = await bookingCollection.insertOne(bookingItem)
       res.send(result)

     })

        app.get('/booking/:id', async (req, res) => {
      const id = req.params.id;
        
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });
     app.get('/booking', async (req, res) => {
       const email = req.query.email;
       if(!email){
         return res.send([]) 
       }
       const query = {email: email}
       const result = await bookingCollection.find(query).toArray()
       res.send(result)
     }) 
    // PATCH route to cancel booking
  app.patch('/booking/cancel/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updateDoc = {
      $set: {
        Response: "cancelled",
      },
    };

    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    res.send(result);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).send({ message: 'Failed to cancel booking' });
  }
  });
    // this is for restaurant 
        app.get('/booking/r/:email', async (req, res) => {
  try {
    const email = req.params.email; 
    const query = { restaurantemail: email };
    const result = await bookingCollection.find(query).toArray();
    res.send(result);
  } catch (error) { 
    console.error("Error in GET /booking/:email:", error);
    res.status(500).send({ message: "Server error" });
  }
        });
    //update to deliverycompleted
    app.patch('/booking/restorder/:id', async (req, res) => {  
  try {
    const id = req.params.id;
    const updateDoc = {
      $set: {
        Response: "deliveryCompleted",
      },
    };

    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
    );

    res.send(result);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).send({ message: 'Failed to cancel booking' });
  }
    });
    
    //all post are here 
   app.get('/posts', async (req, res) => {
      const result = await postCollection.find().toArray();
      res.send(result);
    });
    // insert single item in menu coolection
    app.post('/posts',  async (req, res) => {
      const item = req.body;
      const result = await postCollection.insertOne(item);
      res.send(result);
    });
     app.get('/posts/books/:id', async (req, res) => {
      const id = req.params.id;
        
      const query = { _id: new ObjectId(id) }
      const result = await postCollection.findOne(query);
      res.send(result);
     });
    app.patch('/posts/order/:id', async (req, res) => {
  const offerId = req.params.id;
  const { quantity } = req.body;

  if (typeof quantity !== 'number' || quantity < 0) {
    return res.status(400).json({ error: 'Invalid quantity value' });
  }

  try {
    const result = await postCollection.updateOne(
      { _id: new ObjectId(offerId) },
      { $set: { quantity: quantity } }
    );

    res.send(result); // result.modifiedCount > 0 means success
  } catch (error) {
    console.error('Error updating offer quantity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // payment intent
  app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    console.log(amount, 'amount inside the intent')

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card']
    });
 
    res.send({
      clientSecret: paymentIntent.client_secret
    })
  });
  app.post('/payments', async (req, res) => {
    const payment = req.body;
    const paymentResult = await paymentCollection.insertOne(payment);

    //  carefully delete each item from the cart
    console.log('payment info', payment);
    const query = {
      _id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }
    };

    const deleteResult = await cartCollection.deleteMany(query);

    res.send({ paymentResult, deleteResult });
  })

  app.get('/payments/:email', async (req, res) => {
    const email = req.query.email;
    if(!email){
      return res.send([])
    }
    const query = {email: email}
    const result = await paymentCollection.find(query).toArray()
    res.send(result)
  }) 
  app.get('/payments', async (req, res) => {
    const result = await paymentCollection.find().toArray();
    res.send(result);
  });
//insert reviews in reviews Collection
   app.post('/reviews',  async (req, res) => {
      const item = req.body;
      const result = await reviewCollection.insertOne(item);
      res.send(result);
    });
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    //--------------**** CHOOSEDELIVERYMAN ***---------------------
     app.post('/choosedeliveryman',  async (req, res) => {
      const item = req.body;
      const result = await choosedeliverymanCollection.insertOne(item);
      res.send(result);
    });
    //----------------------- fetchby email deliveryman -----
    
  app.get('/choosedeliveryman', async (req, res) => {
       const email = req.query.email;
       if(!email){
         return res.send([]) 
       }
       const query = {email: email}
       const result = await choosedeliverymanCollection.find(query).toArray()
       res.send(result)
     }) 
  app.patch('/choosedeliveryman', async (req, res) => {
  const { id } = req.body;

  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      responce: 'delivery completed',
    },
  };

  const result = await choosedeliverymanCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// --------------******************** HERE ALL REQUEST FOR FOOD **************-------
 app.post('/rforfood',  async (req, res) => {
      const item = req.body;
      const result = await rforfoodCollection.insertOne(item);
      res.send(result);
    });
 app.get('/rforfood/all',  async (req, res) => {
      const result = await rforfoodCollection.find().toArray();
      res.send(result);
    });

    app.post('/cforfood/all', async (req, res) => {
  const item = req.body;

  // Check if already exists using the original _id
  const exists = await cforfoodCollection.findOne({ _id: item._id });

  if (exists) {
    return res.status(400).send({ message: 'Item already accepted' });
  }

  const result = await cforfoodCollection.insertOne(item);
  res.send(result);
});
// this is for user
 app.get('/cforfood', async (req, res) => {
       const email = req.query.email;
       if(!email){
         return res.send([])
       }
       const query = {email: email}
       const result = await cforfoodCollection.find(query).toArray()
       res.send(result)
     }) 


     app.post('/restaurant-transactions', async (req, res) => {
  const { transactionId, restaurants, paidBy, date } = req.body;

  const entries = restaurants.map(r => ({
    restaurantemail: r.restaurantemail,
    restaurantname: r.restaurantname,
    totalEarning: r.total, 
    paidBy,
    transactionId,
    date,
    status: "pending", // or "toBePaid"
    orders: r.orders.map(o => ({
      menuId: o.menuId,
      name: o.name,
      price: o.price
    }))
  }));

  const result = await restaurantTransactionCollection.insertMany(entries);
  res.send({ insertedCount: result.insertedCount });
});

// this is for restaurant
  app.get('/cforfood/r/:email', async (req, res) => {
  try {
    const email = req.params.email; 
    const query = { restaurantemail: email };
    const result = await cforfoodCollection.find(query).toArray();
    res.send(result);
  } catch (error) { 
    console.error("Error in GET /cforfood/r/:email:", error);
    res.status(500).send({ message: "Server error" });
  }
        });

// Route: GET /payments/summary-by-restaurant
// Assuming Express and MongoDB are set up
app.get('/admin/restaurant-summary', async (req, res) => {
  try {
    const summary = await bookingCollection.aggregate([
      {
        $match: {
          Response: "process" // optional filter
        }
      },
      {
        $group: {
          _id: {
            restaurantname: "$restaurantname",
            restaurantemail: "$restaurantemail"
          },
          totalAmount: { $sum: "$price" },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          restaurantname: "$_id.restaurantname",
          restaurantemail: "$_id.restaurantemail",
          totalAmount: 1,
          totalOrders: 1
        }
      }
    ]).toArray();

    res.send(summary);
  } catch (error) {
    console.error('Failed to fetch admin summary:', error);
    res.status(500).send({ message: 'Error fetching summary' });
  }
});

// Backend endpoint using Express and MongoDB
app.get('/restaurant-transactions', async (req, res) => {
  try {
    const result = await restaurantTransactionCollection
      .find()
      .sort({ date: -1 }) // optional: latest first
      .toArray();
    res.send(result);
  } catch (error) {
    console.error('Failed to fetch restaurant transactions', error);
    res.status(500).send({ message: 'Error fetching restaurant transactions' });
  }
});
// PATCH /restaurant-transactions/:id
app.patch('/restaurant-transactions/:id', async (req, res) => {
  const id = req.params.id;
  const updateDoc = {
    $set: {
      status: req.body.status
    }
  };

  const result = await restaurantTransactionCollection.updateOne(
    { _id: new ObjectId(id) },
    updateDoc
  );

  res.send(result);
});



 

    // Send a ping to confirm a successful connection 
    // await client.db("admin").command({ ping: 1});
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir); 


console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASS:", process.env.DB_PASS);



app.get('/', (req, res) => {
   res.send("app is running")
})
app.listen(port, (req, res) => {
   console.log(`app running port is ${port}`)
})
