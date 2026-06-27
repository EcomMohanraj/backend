import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up database...");
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.category.deleteMany();
  await prisma.storeSettings.deleteMany();

  console.log("Seeding users...");
  // Use exact requested admin email & password: admin@milkymushroom.in / Admin@123
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const customerPasswordHash = await bcrypt.hash("password", 10);

  // Admin User
  const admin = await prisma.user.create({
    data: {
      name: "Milky Mushrooms Admin",
      email: "admin@milkymushroom.in",
      passwordHash: adminPasswordHash,
      role: "admin",
    },
  });
  console.log("Created Admin:", admin.email);

  // Customer User
  const customerUser = await prisma.user.create({
    data: {
      name: "Mohan Kumar",
      email: "customer@gmail.com",
      passwordHash: customerPasswordHash,
      role: "customer",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      userId: customerUser.id,
      name: "Mohan Kumar",
      email: "customer@gmail.com",
      phone: "+91 99887 76655",
    },
  });
  console.log("Created Customer:", customer.email);

  console.log("Seeding categories...");
  const freshCat = await prisma.category.create({
    data: { name: "Fresh", slug: "fresh" },
  });
  const driedCat = await prisma.category.create({
    data: { name: "Dried", slug: "dried" },
  });
  const spawnCat = await prisma.category.create({
    data: { name: "Spawn", slug: "spawn" },
  });
  const powderCat = await prisma.category.create({
    data: { name: "Powder", slug: "powder" },
  });

  console.log("Seeding store settings...");
  await prisma.storeSettings.create({
    data: {
      id: "default",
      storeName: "Milky Mushrooms",
      contactNumber: "+91 99887 76655",
      email: "contact@milkymushroom.in",
      deliveryCharges: 50.0,
      taxPercentage: 5.0,
    },
  });

  console.log("Seeding addresses...");
  const address1 = await prisma.address.create({
    data: {
      customerId: customer.id,
      address: "12, Gandhi Nagar, Near Main Temple",
      city: "Palani",
      pincode: "624601",
      isDefault: true,
    },
  });

  const address2 = await prisma.address.create({
    data: {
      customerId: customer.id,
      address: "Plot 45, Rajaji Street, Kalanampatti",
      city: "Dindigul",
      pincode: "624001",
      isDefault: false,
    },
  });

  console.log("Seeding products...");
  const prod1 = await prisma.product.create({
    data: {
      name: "Premium Fresh Milky Mushrooms",
      slug: "premium-fresh-milky-mushrooms",
      description: "Freshly harvested organic Milky Mushrooms (Calocybe indica) directly from our farm beds. These mushrooms are known for their firm, meaty texture, milky white appearance, and long shelf life. Perfect for stir-fries, soups, and curries.",
      image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600",
      price: 240.0,
      stock: 100,
      categoryId: freshCat.id,
      nutrition: {
        calories: "22 kcal",
        protein: "3.1g",
        carbohydrates: "4.3g",
        fat: "0.2g",
        fiber: "2.5g",
      },
    },
  });

  const prod2 = await prisma.product.create({
    data: {
      name: "Dehydrated Milky Mushroom Slices",
      slug: "dehydrated-milky-mushroom-slices",
      description: "Premium sundried Milky Mushroom slices with intense earthy aroma. Dehydrated at optimal temperatures to preserve nutrients and prolong shelf-life up to 6 months. Rehydrate in warm water for 15 minutes before cooking.",
      image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600",
      price: 350.0,
      stock: 5,
      categoryId: driedCat.id,
      nutrition: {
        calories: "280 kcal",
        protein: "26.5g",
        carbohydrates: "48.2g",
        fat: "1.8g",
        fiber: "18.4g",
      },
    },
  });

  const prod3 = await prisma.product.create({
    data: {
      name: "Milky Mushroom Cultivation Spawn",
      slug: "milky-mushroom-spawn",
      description: "High-quality, laboratory-grown, fully colonized grain spawn of Calocybe indica. Cultivated on sorghum grains under strict sterile conditions. Ideal for mushroom growers looking to inoculate straw beds.",
      image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600",
      price: 120.0,
      stock: 200,
      categoryId: spawnCat.id,
      nutrition: {
        usage: "Mushroom cultivation beds",
      },
    },
  });

  const prod4 = await prisma.product.create({
    data: {
      name: "Organic Milky Mushroom Powder",
      slug: "organic-milky-mushroom-powder",
      description: "100% pure organic Milky Mushroom powder. Ground from dried, selected mushrooms, rich in vitamins and immune-supporting beta-glucans. Add to soups, smoothies, or baking flour for a nutritious boost.",
      image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600",
      price: 450.0,
      stock: 30,
      categoryId: powderCat.id,
      nutrition: {
        calories: "310 kcal",
        protein: "28.0g",
        carbohydrates: "51.0g",
        fat: "1.5g",
        fiber: "19.0g",
      },
    },
  });

  console.log("Seeding blog posts...");
  await prisma.blogPost.createMany({
    data: [
      {
        title: "Spicy Milky Mushroom Fry",
        slug: "spicy-milky-mushroom-fry",
        content: `A quick and delicious South Indian style mushroom stir-fry.
        
### Ingredients:
- 250g Fresh Milky Mushrooms
- 1 Large Onion (sliced)
- 1 Tomato (chopped)
- 1 tsp Ginger-garlic paste
- 1/2 tsp Turmeric powder
- 1 tsp Chilli powder
- 1/2 tsp Black Pepper powder
- Curry leaves & cooking oil

### Method:
1. **Prepare Mushrooms**: Wash and chop mushrooms into bite-sized cubes.
2. **Sauté Aromatics**: Heat oil in a pan, add curry leaves and onions. Fry until onions are soft and translucent.
3. **Add Masalas**: Add ginger-garlic paste, fry for 1 minute, then add tomato and stir in the spices. Cook until oil separates.
4. **Cook Mushrooms**: Add chopped mushrooms. Do not add water; mushrooms release their own moisture.
5. **Finish**: Sauté on medium-high heat for 8-10 minutes until mushrooms are tender and dry. Sprinkle black pepper, garnish, and serve hot!`,
        image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600",
      },
      {
        title: "Creamy Milky Mushroom Soup",
        slug: "creamy-milky-mushroom-soup",
        content: `A comforting, velvet-smooth soup highlighting the meaty texture of Milky Mushrooms.

### Ingredients:
- 200g Fresh Milky Mushrooms
- 2 tbsp Butter
- 1 small Onion (finely chopped)
- 2 cloves Garlic (minced)
- 2 tbsp All-purpose flour
- 2 cups Vegetable/Chicken broth
- 1/2 cup Fresh Cream
- Salt and Pepper to taste

### Method:
1. **Prep**: Clean and finely chop the mushrooms.
2. **Sauté**: Melt butter in a pot over medium heat, add garlic and onion, and sauté for 2 minutes.
3. **Add Mushrooms**: Add chopped mushrooms and cook for 6 minutes until tender.
4. **Thicken**: Sprinkle flour over mushrooms, stir well for 1 minute.
5. **Simmer**: Slowly pour in broth while whisking to avoid lumps. Bring to a boil, reduce heat, and simmer for 10 minutes.
6. **Finish**: Stir in fresh cream, salt, and pepper. Simmer for 1 minute and serve warm.`,
        image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=600",
      },
      {
        title: "Chettinad Milky Mushroom Gravy",
        slug: "chettinad-milky-mushroom-gravy",
        content: `A rich, aromatic Chettinad-style curry made with fresh ground spices.

### Ingredients:
- 250g Milky Mushrooms
- 10 Shallots (chopped)
- 2 Tomatoes (pureed)
- 1 tbsp Chettinad masala powder
- 1/2 cup Coconut milk
- Mustard seeds, fennel seeds, oil

### Method:
1. **Clean & Slice**: Clean and slice the milky mushrooms.
2. **Temper**: Heat oil in a pan, temper with mustard and fennel seeds.
3. **Base Sauté**: Add shallots and sauté until golden brown, then add tomatoes and cook until soft.
4. **Cook**: Add Chettinad masala, salt, and mushrooms. Cover and cook on medium for 6 minutes.
5. **Coconut Addition**: Pour in coconut milk and simmer on low for 3 minutes. Garnish with fresh coriander leaves.`,
        image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=600",
      },
    ],
  });

  console.log("Seeding reviews...");
  await prisma.review.create({
    data: {
      productId: prod1.id,
      customerId: customer.id,
      rating: 5,
      comment: "Absolutely fresh and high quality. The milky mushrooms were firm and delicious in our mushroom biryani!",
    },
  });

  console.log("Seeding orders...");
  // Order 1: Paid and Delivered
  const order1 = await prisma.order.create({
    data: {
      customerId: customer.id,
      amount: 480.0,
      status: "delivered",
      paymentId: "pay_mock_123456",
      address: "12, Gandhi Nagar, Near Main Temple, Palani - 624601",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: prod1.id,
      quantity: 2,
      price: 240.0,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      amount: 480.0,
      status: "success",
      transactionId: "pay_mock_123456",
    },
  });

  // Order 2: Pending
  const order2 = await prisma.order.create({
    data: {
      customerId: customer.id,
      amount: 350.0,
      status: "pending",
      address: "Plot 45, Rajaji Street, Kalanampatti, Dindigul - 624001",
      createdAt: new Date(),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      productId: prod2.id,
      quantity: 1,
      price: 350.0,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
