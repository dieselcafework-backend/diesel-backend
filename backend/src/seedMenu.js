require("dotenv").config();

const connectDB = require("./config/db");
const MenuItem = require("./models/Menu");

// All images are from Pexels (free, no attribution required for usage)
// Format: https://images.pexels.com/photos/{ID}/pexels-photo-{ID}.jpeg?w=400&auto=compress&cs=tinysrgb

const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=400&auto=compress&cs=tinysrgb`;

const menuData = [

  // ─── CHINESE (Starters) ───────────────────────────────────────────────────

  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Chilli Paneer Dry",
    description: "Crispy paneer tossed in a bold chilli sauce — dry style.",
    price: 90, halfPrice: 90, fullPrice: 170,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("29631468"), // Spicy Indo-Chinese chili paneer on plate
  },
  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Chilli Paneer Gravy",
    description: "Soft paneer in a rich, tangy chilli gravy sauce.",
    price: 100, halfPrice: 100, fullPrice: 190,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("29631461"), // Spicy paneer stir-fry in white bowl
  },
  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Chilli Potato",
    description: "Crispy potato strips tossed in spicy chilli sauce.",
    price: 80, halfPrice: 80, fullPrice: 150,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("12737810"), // Stir-fried vegetables in bowl
  },
  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Honey Chilli Potato",
    description: "Crispy potato strips glazed with honey chilli sauce — sweet, spicy & addictive.",
    price: 90, halfPrice: 90, fullPrice: 170,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("12737816"), // Indian paneer curry with bell peppers (closest visual match)
  },
  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Chilli Momos Dry",
    description: "Steamed momos tossed in a fiery chilli sauce — dry style.",
    price: 100, halfPrice: 100, fullPrice: 190,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("18803177"), // Tibetan momos garnished with herbs
  },
  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Chilli Momos Gravy",
    description: "Steamed momos dunked in a rich, spicy chilli gravy.",
    price: 110, halfPrice: 110, fullPrice: 210,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("3926123"), // Jhol momo in savory broth
  },
  {
    superCategory: "Chinese", subCategory: "Starters",
    name: "Crispy Corn",
    description: "Golden fried corn kernels tossed with herbs and spices.",
    price: 90, halfPrice: 90, fullPrice: 170,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("28674541"), // Spicy Indian paneer tikka in tomato gravy (vibrant orange — closest)
  },

  // ─── SNACKS — Momos & Springroll ──────────────────────────────────────────

  {
    superCategory: "Snacks", subCategory: "Momos & Springroll",
    name: "Momos",
    description: "Steamed dumplings packed with seasoned vegetables, served with chutney.",
    price: 20, halfPrice: 20, fullPrice: 40,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("18803174"), // Tibetan momos with dipping sauces
  },
  {
    superCategory: "Snacks", subCategory: "Momos & Springroll",
    name: "Paneer Momos",
    description: "Delicate steamed dumplings filled with spiced paneer and herbs.",
    price: 30, halfPrice: 30, fullPrice: 60,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("28445589"), // Paneer momos with chutney on marble
  },
  {
    superCategory: "Snacks", subCategory: "Momos & Springroll",
    name: "Fried Momos",
    description: "Golden fried crispy momos — irresistible snack.",
    price: 30, halfPrice: 30, fullPrice: 60,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("5409009"), // Fried round dumplings on black ceramic bowl
  },
  {
    superCategory: "Snacks", subCategory: "Momos & Springroll",
    name: "Springroll",
    description: "Crispy golden rolls stuffed with seasoned vegetables.",
    price: 30, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3911228"), // Dim sum on ceramic plate
  },

  // ─── SNACKS — Fries ───────────────────────────────────────────────────────

  {
    superCategory: "Snacks", subCategory: "Fries",
    name: "French Fries",
    description: "Classic golden crispy fries, perfectly salted.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1893555"), // Classic golden french fries
  },
  {
    superCategory: "Snacks", subCategory: "Fries",
    name: "Peri Peri Fries",
    description: "Crispy fries dusted with spicy peri peri seasoning.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2097090"), // Seasoned fries with dip
  },
  {
    superCategory: "Snacks", subCategory: "Fries",
    name: "Cheese Fries",
    description: "Golden fries smothered in rich melted cheese sauce.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4109072"), // Cheese fries close-up
  },
  {
    superCategory: "Snacks", subCategory: "Fries",
    name: "Chinese Bhel",
    description: "Crispy noodles tossed with vegetables and tangy sauces — a street-style favourite.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("5409010"), // Momo dish black plate (crispy snack visual)
  },

  // ─── SNACKS — Sandwich ────────────────────────────────────────────────────

  {
    superCategory: "Snacks", subCategory: "Sandwich",
    name: "Veg Sandwich",
    description: "Fresh vegetables layered in toasted bread with mint chutney.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1647163"), // Toast sandwich with vegetables
  },
  {
    superCategory: "Snacks", subCategory: "Sandwich",
    name: "Cheese Sandwich",
    description: "Toasted sandwich loaded with gooey melted cheese.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4518688"), // Grilled cheese sandwich close-up
  },
  {
    superCategory: "Snacks", subCategory: "Sandwich",
    name: "Paneer Sandwich",
    description: "Spiced paneer filling in a toasted sandwich with fresh veggies.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("5949880"), // Indian style paneer sandwich
  },
  {
    superCategory: "Snacks", subCategory: "Sandwich",
    name: "Masala Corn Sandwich",
    description: "Toasted sandwich filled with spiced sweet corn and tangy sauces.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3807517"), // Toasted sandwich with filling
  },
  {
    superCategory: "Snacks", subCategory: "Sandwich",
    name: "Cheese Paneer Sandwich",
    description: "The ultimate combo — paneer and melted cheese in a toasted sandwich.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1437267"), // Loaded sandwich with cheese
  },

  // ─── SNACKS — Burger ──────────────────────────────────────────────────────

  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Veg Burger",
    description: "Crispy veggie patty in a soft bun with fresh veggies and sauce.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1639562"), // Veggie burger on wooden board
  },
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Paneer Burger",
    description: "Grilled paneer patty topped with fresh veggies and secret café sauce.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3738406"), // Burger with fresh ingredients
  },
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Cheese Burger",
    description: "Double cheese slices melt over a crispy patty — pure cheesy bliss.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1199957"), // Classic cheeseburger close-up
  },
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Paneer + Cheese Burger",
    description: "The best of both worlds — paneer patty with extra cheese.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2271107"), // Double loaded burger
  },

  // ─── PASTA & MAGGIE — Pasta ───────────────────────────────────────────────

  {
    superCategory: "Pasta & Maggie", subCategory: "Pasta",
    name: "Red Sauce Pasta",
    description: "Al dente pasta smothered in a rich, tangy tomato-based Arrabbiata sauce.",
    price: 129, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1279330"), // Red sauce pasta in bowl
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Pasta",
    name: "White Sauce Pasta",
    description: "Creamy béchamel pasta with herbs — comforting and indulgent.",
    price: 139, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1438672"), // Creamy white pasta in bowl
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Pasta",
    name: "Cheesey Baked Pasta",
    description: "Oven-baked pasta loaded with melted cheese — rich and irresistible.",
    price: 159, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3887946"), // Baked cheesy pasta dish
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Pasta",
    name: "Macaroni",
    description: "Classic macaroni pasta tossed with vegetables and a light sauce.",
    price: 39, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1527603"), // Macaroni pasta bowl
  },

  // ─── PASTA & MAGGIE — Maggi ───────────────────────────────────────────────

  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Plain Maggi",
    description: "Classic Maggi noodles prepared to perfection — simple and satisfying.",
    price: 25, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4393021"), // Instant noodles in bowl
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Butter Maggi",
    description: "Maggi noodles cooked in generous butter for a rich, comforting taste.",
    price: 35, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("5560149"), // Buttery noodles in bowl
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Veg Maggi",
    description: "Everyone's favourite — classic Maggi noodles with fresh vegetables.",
    price: 45, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("6544370"), // Noodles with vegetables
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Paneer Maggi",
    description: "Creamy Maggi noodles loaded with soft paneer cubes and spices.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("7625260"), // Noodles with paneer-style topping
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Cheese Maggi",
    description: "Gooey melted cheese mixed into hot Maggi — pure comfort in a bowl.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3026810"), // Cheesy noodle bowl
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Chilli Garlic Maggi",
    description: "Spicy Maggi noodles with a punch of chilli and aromatic garlic.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("699953"), // Spicy noodles in bowl
  },
  {
    superCategory: "Pasta & Maggie", subCategory: "Maggie",
    name: "Schezwan Maggi",
    description: "Bold Schezwan sauce meets Maggi noodles for a fiery Indo-Chinese kick.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1640777"), // Red spicy noodles
  },

  // ─── NOODLES ──────────────────────────────────────────────────────────────

  {
    superCategory: "Noodles", subCategory: "Noodles",
    name: "Veg Noodles",
    description: "Wok-tossed noodles with fresh vegetables and fragrant seasoning.",
    price: 70, halfPrice: 70, fullPrice: 130,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("3026808"), // Stir-fried noodles with vegetables
  },
  {
    superCategory: "Noodles", subCategory: "Noodles",
    name: "Hakka Noodles",
    description: "Classic Hakka-style noodles tossed with vegetables and soy sauce.",
    price: 80, halfPrice: 80, fullPrice: 150,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("2347311"), // Asian noodles in bowl with chopsticks
  },
  {
    superCategory: "Noodles", subCategory: "Noodles",
    name: "Chilli Garlic Noodles",
    description: "Noodles packed with the bold flavours of chilli and garlic.",
    price: 80, halfPrice: 80, fullPrice: 150,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("1279330"), // Spicy noodle dish
  },
  {
    superCategory: "Noodles", subCategory: "Noodles",
    name: "Schezwan Noodles",
    description: "Fiery Schezwan sauce meets perfectly stir-fried noodles.",
    price: 80, halfPrice: 80, fullPrice: 150,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("3763847"), // Red spicy noodles stir-fry
  },
  {
    superCategory: "Noodles", subCategory: "Noodles",
    name: "Paneer Noodles",
    description: "Stir-fried noodles elevated with soft, spiced paneer cubes.",
    price: 90, halfPrice: 90, fullPrice: 160,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("31783383"), // Indian-Chinese fusion Manchurian Paneer with fried rice
  },

  // ─── NOODLES — Fried Rice ─────────────────────────────────────────────────

  {
    superCategory: "Noodles", subCategory: "Fried Rice",
    name: "Veg Fried Rice",
    description: "Wok-tossed rice with fresh vegetables and fragrant seasoning.",
    price: 70, halfPrice: 70, fullPrice: 130,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("723198"), // Fried rice in wok
  },
  {
    superCategory: "Noodles", subCategory: "Fried Rice",
    name: "Schezwan Fried Rice",
    description: "Bold, fiery Schezwan sauce meets perfectly fried rice.",
    price: 80, halfPrice: 80, fullPrice: 150,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("1624487"), // Spicy fried rice with red chilli
  },
  {
    superCategory: "Noodles", subCategory: "Fried Rice",
    name: "Chilli Garlic Fried Rice",
    description: "Fried rice with a punchy chilli garlic flavour profile.",
    price: 80, halfPrice: 80, fullPrice: 150,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("3026804"), // Fried rice with garlic and vegetables
  },
  {
    superCategory: "Noodles", subCategory: "Fried Rice",
    name: "Paneer Fried Rice",
    description: "Classic fried rice elevated with fresh paneer cubes and aromatic spices.",
    price: 90, halfPrice: 90, fullPrice: 160,
    halfDescription: "Half plate", fullDescription: "Full plate",
    veg: true, available: true,
    image: P("9609859"), // Paneer biryani with sauces
  },

  // ─── BEVERAGES — Chai & Coffee ────────────────────────────────────────────

  {
    superCategory: "Beverages", subCategory: "Chai & Coffee",
    name: "Chai",
    description: "Classic Indian masala chai — warm, spiced and comforting.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"), // Masala chai in glass
  },
  {
    superCategory: "Beverages", subCategory: "Chai & Coffee",
    name: "Gud Chai",
    description: "Traditional chai sweetened with jaggery for an earthy, natural sweetness.",
    price: 30, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4349804"), // Rustic tea in clay cup
  },
  {
    superCategory: "Beverages", subCategory: "Chai & Coffee",
    name: "Coffee",
    description: "Classic hot coffee, freshly brewed to warm you up.",
    price: 35, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("302899"), // Hot coffee in white cup
  },
  {
    superCategory: "Beverages", subCategory: "Chai & Coffee",
    name: "Strong Coffee",
    description: "Extra bold, strong brewed coffee for serious coffee lovers.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("374757"), // Dark espresso in cup
  },

  // ─── BEVERAGES — Shakes & Cold Coffee ────────────────────────────────────

  {
    superCategory: "Beverages", subCategory: "Shakes & Cold Coffee",
    name: "Strawberry Shake",
    description: "Sweet, pink and luscious — a classic strawberry milkshake.",
    price: 99, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727250"), // Pink strawberry milkshake with straw
  },
  {
    superCategory: "Beverages", subCategory: "Shakes & Cold Coffee",
    name: "Oreo Shake",
    description: "Thick, dreamy milkshake blended with crushed Oreo cookies.",
    price: 99, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1092730"), // Dark cookies and cream milkshake
  },
  {
    superCategory: "Beverages", subCategory: "Shakes & Cold Coffee",
    name: "KitKat Shake",
    description: "Indulgent chocolate milkshake blended with crunchy KitKat bars.",
    price: 99, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727255"), // Chocolate shake with wafer
  },
  {
    superCategory: "Beverages", subCategory: "Shakes & Cold Coffee",
    name: "Chocolate Shake",
    description: "Pure chocolate bliss — thick, creamy and deeply satisfying.",
    price: 99, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727249"), // Rich chocolate milkshake
  },
  {
    superCategory: "Beverages", subCategory: "Shakes & Cold Coffee",
    name: "Cold Coffee",
    description: "Rich, frothy cold coffee blended to café perfection.",
    price: 89, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1193335"), // Iced cold coffee with foam
  },

  // ─── BEVERAGES — Soft Drinks ──────────────────────────────────────────────

  {
    superCategory: "Beverages", subCategory: "Soft Drinks",
    name: "Sprite",
    description: "Chilled refreshing Sprite — the perfect thirst quencher.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("50593"), // Cold fizzy drink with ice
  },
  {
    superCategory: "Beverages", subCategory: "Soft Drinks",
    name: "Thumbs Up",
    description: "Bold and fizzy Thums Up cola — strong taste, great refreshment.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2775218"), // Dark cola with ice in glass
  },
  {
    superCategory: "Beverages", subCategory: "Soft Drinks",
    name: "Coke",
    description: "Classic chilled Coca-Cola — timeless and refreshing.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2775218"), // Cola with ice and bubbles
  },
  {
    superCategory: "Beverages", subCategory: "Soft Drinks",
    name: "Maaza",
    description: "Sweet mango drink — a tropical burst of flavour.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3625372"), // Mango juice drink in glass
  },

  // ─── COMBOS ───────────────────────────────────────────────────────────────

  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chilli Paneer & Noodles",
    description: "Chilli Paneer paired with your choice of noodles — a satisfying combo.",
    price: 89, halfPrice: 89, fullPrice: 149,
    halfDescription: "Half combo", fullDescription: "Full combo",
    veg: true, available: true,
    image: P("31783383"), // Indian-Chinese Manchurian Paneer with fried rice
  },
  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chilli Paneer & Fried Rice",
    description: "Chilli Paneer served alongside fragrant fried rice — a classic combo.",
    price: 89, halfPrice: 89, fullPrice: 149,
    halfDescription: "Half combo", fullDescription: "Full combo",
    veg: true, available: true,
    image: P("29631461"), // Paneer stir-fry with rice combo
  },
  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chilli Potato & Noodles",
    description: "Spicy Chilli Potato with a side of flavourful noodles.",
    price: 69, halfPrice: 69, fullPrice: 129,
    halfDescription: "Half combo", fullDescription: "Full combo",
    veg: true, available: true,
    image: P("3026808"), // Potato & noodle combo
  },
  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chilli Potato & Fried Rice",
    description: "Crispy Chilli Potato paired with wok-tossed fried rice.",
    price: 69, halfPrice: 69, fullPrice: 129,
    halfDescription: "Half combo", fullDescription: "Full combo",
    veg: true, available: true,
    image: P("723198"), // Potato with fried rice
  },
  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chilli Momos & Fried Rice",
    description: "Spicy Chilli Momos with a generous serving of fried rice.",
    price: 89, halfPrice: 89, fullPrice: 149,
    halfDescription: "Half combo", fullDescription: "Full combo",
    veg: true, available: true,
    image: P("18803174"), // Momos with dipping sauce
  },
  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chilli Momos & Noodles",
    description: "Spicy Chilli Momos paired with stir-fried noodles.",
    price: 89, halfPrice: 89, fullPrice: 149,
    halfDescription: "Half combo", fullDescription: "Full combo",
    veg: true, available: true,
    image: P("28445593"), // Nepalese momos with chutney
  },
  {
    superCategory: "Combos", subCategory: "Combos",
    name: "Chai & Maggi",
    description: "A warm cup of chai paired with classic Maggi — the ultimate snack combo.",
    price: 59, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"), // Chai with noodles combo
  },
];

const seedMenu = async () => {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    await MenuItem.deleteMany({});
    console.log("🗑️  Existing menu cleared");

    await MenuItem.insertMany(menuData);
    console.log(`🍽️  ${menuData.length} menu items seeded successfully`);

    const counts = menuData.reduce((acc, item) => {
      acc[item.superCategory] = (acc[item.superCategory] || 0) + 1;
      return acc;
    }, {});
    console.log("\n📊 Breakdown by category:");
    Object.entries(counts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} items`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedMenu();
