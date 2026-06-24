require("dotenv").config();

const connectDB = require("./config/db");
const MenuItem = require("./models/Menu");

// All images are from Pexels (free, no attribution required for usage)
// Format: https://images.pexels.com/photos/{ID}/pexels-photo-{ID}.jpeg?w=400&auto=compress&cs=tinysrgb
// NOTE: these are placeholder images. Replace any of them anytime via
// Admin Dashboard → Menu → Edit Item → Image URL.

const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=400&auto=compress&cs=tinysrgb`;

const menuData = [

  // ═══════════════════════════════════════════════════════════════════════════
  // BEVERAGES
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Hot Beverages ────────────────────────────────────────────────────────
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Cutting Tea",
    description: "Small, strong Indian-style tea — the classic café cutting chai.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Masala Tea",
    description: "Aromatic tea brewed with traditional Indian spices.",
    price: 35, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Elaichi Tea",
    description: "Fragrant cardamom-infused tea — warm and soothing.",
    price: 35, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Black Tea",
    description: "Pure, robust black tea served hot — no milk, just flavour.",
    price: 20, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4349804"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Ginger Tea",
    description: "Spicy ginger-infused tea, perfect for a refreshing kick.",
    price: 35, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Green Tea",
    description: "Light, antioxidant-rich green tea — clean and refreshing.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4349804"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Kadha (Gud/Sugar/Honey)",
    description: "Traditional herbal kadha sweetened with your choice of jaggery, sugar or honey.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4349804"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Rose Tea",
    description: "Delicate rose-flavoured tea with a fragrant floral aroma.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Cinnamon Tea",
    description: "Warm, spiced tea infused with rich cinnamon flavour.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Blue Tea",
    description: "Vibrant butterfly pea flower tea — light, calming and Instagram-worthy.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4349804"),
  },
  {
    superCategory: "Beverages", subCategory: "Hot Beverages",
    name: "Lemon Tea",
    description: "Tangy, citrusy tea with a refreshing twist of lemon.",
    price: 30, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },

  // ─── Coffee ───────────────────────────────────────────────────────────────
  {
    superCategory: "Beverages", subCategory: "Coffee",
    name: "Black Coffee",
    description: "Pure, bold black coffee — no milk, just caffeine.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("302899"),
  },
  {
    superCategory: "Beverages", subCategory: "Coffee",
    name: "Cappuccino",
    description: "Classic Italian coffee with steamed milk and a frothy top.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("302899"),
  },
  {
    superCategory: "Beverages", subCategory: "Coffee",
    name: "Instant Coffee",
    description: "Quick, comforting instant coffee — simple and satisfying.",
    price: 30, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("302899"),
  },
  {
    superCategory: "Beverages", subCategory: "Coffee",
    name: "Latte",
    description: "Smooth, creamy latte with a perfect milk-to-coffee balance.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("302899"),
  },
  {
    superCategory: "Beverages", subCategory: "Coffee",
    name: "Mocha",
    description: "Rich blend of coffee and chocolate — indulgent and bold.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("374757"),
  },

  // ─── Cold Beverages ───────────────────────────────────────────────────────
  {
    superCategory: "Beverages", subCategory: "Cold Beverages",
    name: "Lassi",
    description: "Thick, creamy yogurt-based drink — a classic Punjabi refresher.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1193335"),
  },
  {
    superCategory: "Beverages", subCategory: "Cold Beverages",
    name: "Buttermilk",
    description: "Light, tangy spiced buttermilk — cooling and digestive.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1193335"),
  },
  {
    superCategory: "Beverages", subCategory: "Cold Beverages",
    name: "Masala & Mint Buttermilk",
    description: "Refreshing buttermilk infused with masala spices and fresh mint.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1193335"),
  },
  {
    superCategory: "Beverages", subCategory: "Cold Beverages",
    name: "Lemonade",
    description: "Chilled, zesty lemonade — the perfect thirst quencher.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("50593"),
  },
  {
    superCategory: "Beverages", subCategory: "Cold Beverages",
    name: "Ice Tea",
    description: "Cool, refreshing iced tea with a hint of citrus.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("50593"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHAKES & SOUPS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Shakes ───────────────────────────────────────────────────────────────
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Cold Coffee",
    description: "Rich, frothy cold coffee blended to café perfection.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1193335"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Cold Coffee with Ice Cream",
    description: "Classic cold coffee crowned with a generous scoop of vanilla ice cream.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1193335"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Oreo Shake",
    description: "Thick, dreamy milkshake blended with crushed Oreo cookies.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1092730"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Kitkat Shake",
    description: "Indulgent chocolate milkshake blended with crunchy KitKat bars.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727255"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Chocolate Shake",
    description: "Pure chocolate bliss — thick, creamy and deeply satisfying.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727249"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Mango Shake",
    description: "Real mango blended into a thick, refreshing summer shake.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3625372"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Mix Fruit Shake",
    description: "A vibrant blend of seasonal fresh fruits into one refreshing glass.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3625372"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Shakes",
    name: "Strawberry Shake",
    description: "Sweet, pink and luscious — a classic strawberry milkshake.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727250"),
  },

  // ─── Soups ────────────────────────────────────────────────────────────────
  {
    superCategory: "Shakes & Soups", subCategory: "Soups",
    name: "Veg Sweet Corn Soup",
    description: "Creamy, comforting sweet corn soup with a hint of pepper.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("699953"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Soups",
    name: "Veg Manchow Soup",
    description: "Thick, spicy Indo-Chinese soup loaded with vegetables and crispy noodles.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("699953"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Soups",
    name: "Veg Hot & Sour Soup",
    description: "Bold, tangy soup with the perfect balance of heat and sourness.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("699953"),
  },
  {
    superCategory: "Shakes & Soups", subCategory: "Soups",
    name: "Tomato Soup",
    description: "Rich, velvety tomato soup with fresh basil and a swirl of cream.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1279330"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SNACKS (Maggi · Burger · Sandwich · Tea Complimentary)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Maggi ────────────────────────────────────────────────────────────────
  {
    superCategory: "Snacks", subCategory: "Maggi",
    name: "Veg Maggi",
    description: "Everyone's favourite — classic Maggi noodles with fresh vegetables.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4393021"),
  },
  {
    superCategory: "Snacks", subCategory: "Maggi",
    name: "Paneer Maggi",
    description: "Creamy Maggi noodles loaded with soft paneer cubes and spices.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("7625260"),
  },
  {
    superCategory: "Snacks", subCategory: "Maggi",
    name: "Cheese & Corn Maggi",
    description: "Gooey melted cheese and sweet corn mixed into hot Maggi.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3026810"),
  },
  {
    superCategory: "Snacks", subCategory: "Maggi",
    name: "Soup Maggi",
    description: "Warm, soupy Maggi noodles in a comforting broth — perfect for cold days.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("5560149"),
  },

  // ─── Burger ───────────────────────────────────────────────────────────────
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Veg Burger (Aloo Tikki)",
    description: "Crispy spiced potato tikki patty in a soft bun with fresh veggies.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1639562"),
  },
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Paneer Burger",
    description: "Grilled paneer patty topped with fresh veggies and secret café sauce.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3738406"),
  },
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Cheese Burger",
    description: "Double cheese slices melt over a crispy patty — pure cheesy bliss.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1199957"),
  },
  {
    superCategory: "Snacks", subCategory: "Burger",
    name: "Schezwan Cheese Burger",
    description: "A fiery Schezwan kick topped with melted cheese — for the brave ones.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2271107"),
  },

  // ─── Sandwiches ───────────────────────────────────────────────────────────
  {
    superCategory: "Snacks", subCategory: "Sandwiches",
    name: "Veg Sandwich",
    description: "Fresh vegetables layered in toasted bread with mint chutney.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1647163"),
  },
  {
    superCategory: "Snacks", subCategory: "Sandwiches",
    name: "Paneer Sandwich",
    description: "Spiced paneer filling in a toasted sandwich with fresh veggies.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("5949880"),
  },
  {
    superCategory: "Snacks", subCategory: "Sandwiches",
    name: "Double Cheese Veg Sandwich",
    description: "Loaded with double cheese and fresh vegetables — extra indulgent.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4518688"),
  },
  {
    superCategory: "Snacks", subCategory: "Sandwiches",
    name: "Double Cheese Paneer Sandwich",
    description: "The ultimate combo — paneer and double melted cheese in toasted bread.",
    price: 190, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1437267"),
  },
  {
    superCategory: "Snacks", subCategory: "Sandwiches",
    name: "Veg Grill Sandwich",
    description: "Perfectly grilled sandwich packed with fresh, crunchy vegetables.",
    price: 180, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3807517"),
  },

  // ─── Tea Complimentary ────────────────────────────────────────────────────
  {
    superCategory: "Snacks", subCategory: "Tea Complimentary",
    name: "Bun Maska",
    description: "Soft bun generously spread with creamy butter — a café classic pairing.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1638280"),
  },
  {
    superCategory: "Snacks", subCategory: "Tea Complimentary",
    name: "Bread Butter",
    description: "Simple toasted bread slices with a generous layer of butter.",
    price: 40, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4518688"),
  },
  {
    superCategory: "Snacks", subCategory: "Tea Complimentary",
    name: "Peanut Butter Bread",
    description: "Toasted bread slathered with rich, creamy peanut butter.",
    price: 60, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1647163"),
  },
  {
    superCategory: "Snacks", subCategory: "Tea Complimentary",
    name: "Garlic Bread",
    description: "Crispy toasted bread infused with aromatic garlic butter.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1438672"),
  },
  {
    superCategory: "Snacks", subCategory: "Tea Complimentary",
    name: "Cheese Garlic Bread",
    description: "Garlic bread loaded with melted cheese — rich and irresistible.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3887946"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PASTA & MACARONI
  // ═══════════════════════════════════════════════════════════════════════════

  {
    superCategory: "Pasta & Macaroni", subCategory: "Macaroni",
    name: "Veg Macaroni",
    description: "Classic macaroni pasta tossed with seasonal vegetables and rich sauce.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1527603"),
  },
  {
    superCategory: "Pasta & Macaroni", subCategory: "Pasta",
    name: "Red Sauce Pasta",
    description: "Al dente pasta smothered in a rich, tangy tomato-based Arrabbiata sauce.",
    price: 210, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1279330"),
  },
  {
    superCategory: "Pasta & Macaroni", subCategory: "Pasta",
    name: "White Sauce Pasta",
    description: "Creamy béchamel pasta with herbs — comforting and indulgent.",
    price: 290, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1438672"),
  },
  {
    superCategory: "Pasta & Macaroni", subCategory: "Pasta",
    name: "Wheat Pasta",
    description: "Healthy whole wheat pasta packed with fresh garden vegetables.",
    price: 300, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3887946"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN COURSE & CHINESE
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Momo Special ─────────────────────────────────────────────────────────
  {
    superCategory: "Main Course & Chinese", subCategory: "Momo Special",
    name: "Steam Veg Momos (8 pcs)",
    description: "Steamed dumplings packed with seasoned vegetables, served with chutney.",
    price: 50, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("18803174"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Momo Special",
    name: "Steam Paneer Momos (8 pcs)",
    description: "Delicate steamed dumplings filled with spiced paneer and herbs.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("28445589"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Momo Special",
    name: "Soup Momos (6 pcs)",
    description: "Momos served in a flavourful, aromatic soup broth — warming and satisfying.",
    price: 80, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3926123"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Momo Special",
    name: "Jhol Momos (6 pcs)",
    description: "Nepali-style momos bathed in a spicy, tangy jhol achar sauce.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("28445593"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Momo Special",
    name: "Afgani Momos (6 pcs)",
    description: "Momos in a rich, creamy white Afghani sauce — truly indulgent.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("18803177"),
  },

  // ─── Tikka & Kebab ────────────────────────────────────────────────────────
  {
    superCategory: "Main Course & Chinese", subCategory: "Tikka & Kebab",
    name: "Paneer Tikka",
    description: "Char-grilled marinated paneer cubes with bell peppers and onions.",
    price: 300, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("28674541"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Tikka & Kebab",
    name: "Beetroot Kebab",
    description: "Vibrant beetroot kebabs, spiced and grilled to smoky perfection.",
    price: 200, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("12737816"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Tikka & Kebab",
    name: "Chickpea Kebab",
    description: "Protein-rich chickpea kebabs with a crispy outer crust.",
    price: 200, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("12737810"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Tikka & Kebab",
    name: "Crispy Corn Kebab",
    description: "Golden fried corn kebabs with herbs and a crunchy bite.",
    price: 250, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("28674541"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Tikka & Kebab",
    name: "Crispy Baby Corn",
    description: "Crunchy battered baby corn, fried golden and flavour-packed.",
    price: 250, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("12737810"),
  },

  // ─── Noodles & Rice ───────────────────────────────────────────────────────
  {
    superCategory: "Main Course & Chinese", subCategory: "Noodles & Rice",
    name: "Veg Chowmein",
    description: "Wok-tossed noodles with fresh vegetables and fragrant seasoning.",
    price: 130, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3026808"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Noodles & Rice",
    name: "Paneer Chowmein",
    description: "Stir-fried noodles elevated with soft, spiced paneer cubes.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("31783383"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Noodles & Rice",
    name: "Hakka Noodles",
    description: "Classic Hakka-style noodles tossed with vegetables and soy sauce.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2347311"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Noodles & Rice",
    name: "Veg Fried Rice",
    description: "Wok-tossed rice with fresh vegetables and fragrant seasoning.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("723198"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Noodles & Rice",
    name: "Paneer Fried Rice",
    description: "Classic fried rice elevated with fresh paneer cubes and aromatic spices.",
    price: 250, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("9609859"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Noodles & Rice",
    name: "Schezwan Fried Rice",
    description: "Bold, fiery Schezwan sauce meets perfectly fried rice for a spicy treat.",
    price: 250, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1624487"),
  },

  // ─── Chinese Starters ─────────────────────────────────────────────────────
  {
    superCategory: "Main Course & Chinese", subCategory: "Chinese Starters",
    name: "Veg Manchurian (Dry/Gravy)",
    description: "Crispy vegetable balls tossed in a tangy, spicy sauce — choose Dry or Gravy.",
    price: 180, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("29631468"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Chinese Starters",
    name: "Paneer Manchurian (Dry/Gravy)",
    description: "Soft paneer cubes in a rich Manchurian sauce — choose Dry or Gravy.",
    price: 200, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("29631461"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Chinese Starters",
    name: "Paneer Chilli (Dry/Gravy)",
    description: "Juicy paneer tossed with bell peppers and chilli sauce — choose Dry or Gravy.",
    price: 250, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("29631461"),
  },
  {
    superCategory: "Main Course & Chinese", subCategory: "Chinese Starters",
    name: "Honey Chilli Potato",
    description: "Crispy potato strips glazed with honey chilli sauce — sweet, spicy & addictive.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("12737816"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PIZZA, FRIES & SALADS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Pizza ────────────────────────────────────────────────────────────────
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Pizza",
    name: "Margherita Pizza",
    description: "Classic cheese pizza with a rich tomato base — timeless and simple.",
    price: 200, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("825661"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Pizza",
    name: "Onion & Capsicum Pizza",
    description: "Loaded with fresh onions and crunchy capsicum on a cheesy base.",
    price: 250, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1146760"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Pizza",
    name: "Paneer Pizza",
    description: "Spiced paneer chunks generously topped over melted cheese.",
    price: 300, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("825661"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Pizza",
    name: "Farmhouse Pizza",
    description: "Loaded veggie pizza with onions, capsicum, tomato, corn and olives.",
    price: 400, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1146760"),
  },

  // ─── Fries ────────────────────────────────────────────────────────────────
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Fries",
    name: "Salted Fries",
    description: "Classic golden crispy fries, perfectly salted.",
    price: 70, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1893555"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Fries",
    name: "Peri-Peri Fries",
    description: "Crispy fries dusted with spicy peri-peri seasoning.",
    price: 90, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("2097090"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Fries",
    name: "Cheese Fries",
    description: "Golden fries smothered in rich melted cheese sauce.",
    price: 120, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("4109072"),
  },

  // ─── Salads ───────────────────────────────────────────────────────────────
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Salads",
    name: "Fruit Chaat",
    description: "Refreshing mix of seasonal fruits tossed with chaat masala.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3625372"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Salads",
    name: "Fruit Custard",
    description: "Chilled creamy custard loaded with fresh seasonal fruits.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1092730"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Salads",
    name: "Fruit Salad with Ice Cream",
    description: "Fresh fruit salad topped with a generous scoop of vanilla ice cream.",
    price: 200, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("3727250"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Salads",
    name: "Cucumber Salad",
    description: "Light, crisp cucumber salad with a refreshing tangy dressing.",
    price: 100, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("699953"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Salads",
    name: "Paneer & Veggie Salad",
    description: "Fresh vegetables and soft paneer cubes in a wholesome salad bowl.",
    price: 150, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("12737816"),
  },
  {
    superCategory: "Pizza, Fries & Salads", subCategory: "Salads",
    name: "Soya Chunks Salad",
    description: "Protein-packed soya chunks tossed with fresh vegetables and herbs.",
    price: 190, halfPrice: null, fullPrice: null,
    veg: true, available: true,
    image: P("1058114"),
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