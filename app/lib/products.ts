
export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  currency: "USD";
  location: string;
  emoji: string;
  color: string;
  condition: string;
  seller: string;
  featured: boolean;
  description: string;
};

export type MarketplaceListing = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: "USD" | "LRD";
  location: string;
  emoji: string;
  color: string;
  condition: string;
  seller: string;
  featured: boolean;
  description: string;
  imageUrl: string | null;
  moderationStatus: string;
};

export const productCategories = [
  "Electronics",
  "Fashion",
  "Vehicles",
  "Home & Living",
  "Property",
  "Food & Grocery",
  "Beauty",
  "Agriculture",
  "Services",
  "Other",
] as const;

export const products: Product[] = [
  {
    id: 1,
    name: "Smartphone 128GB",
    category: "Electronics",
    price: 280,
    currency: "USD",
    location: "Monrovia, Montserrado",
    emoji: "📱",
    color: "from-sky-100 to-blue-200",
    condition: "New",
    seller: "City Electronics",
    featured: true,
    description:
      "A modern smartphone with 128GB of storage. Contact the seller to confirm the brand, specifications, warranty, and availability before purchasing.",
  },
  {
    id: 2,
    name: "Classic Sneakers",
    category: "Fashion",
    price: 35,
    currency: "USD",
    location: "Paynesville, Montserrado",
    emoji: "👟",
    color: "from-orange-100 to-amber-200",
    condition: "New",
    seller: "Fashion Hub",
    featured: false,
    description:
      "Classic everyday sneakers. Ask the seller about available sizes, colors, materials, and delivery options.",
  },
  {
    id: 3,
    name: "Mountain Bicycle",
    category: "Vehicles",
    price: 120,
    currency: "USD",
    location: "Gbarnga, Bong",
    emoji: "🚲",
    color: "from-green-100 to-emerald-200",
    condition: "Used",
    seller: "Sam's Store",
    featured: true,
    description:
      "A mountain bicycle for everyday riding and outdoor adventures. Confirm its condition and inspect it before making a purchase.",
  },
  {
    id: 4,
    name: "Modern Living Chair",
    category: "Home & Living",
    price: 85,
    currency: "USD",
    location: "Monrovia, Montserrado",
    emoji: "🪑",
    color: "from-rose-100 to-pink-200",
    condition: "New",
    seller: "Home Comfort",
    featured: false,
    description:
      "A modern chair for your living space. Contact the seller for dimensions, materials, available colors, and delivery arrangements.",
  },
  {
    id: 5,
    name: "Fresh Garden Produce",
    category: "Food & Grocery",
    price: 12,
    currency: "USD",
    location: "Kakata, Margibi",
    emoji: "🥬",
    color: "from-lime-100 to-green-200",
    condition: "Fresh",
    seller: "Farm Direct",
    featured: false,
    description:
      "Fresh garden produce offered by a sample local seller. Confirm the available produce, quantity, freshness, and pickup arrangements.",
  },
  {
    id: 6,
    name: "Luxury Wristwatch",
    category: "Fashion",
    price: 45,
    currency: "USD",
    location: "Buchanan, Grand Bassa",
    emoji: "⌚",
    color: "from-violet-100 to-purple-200",
    condition: "New",
    seller: "Style Corner",
    featured: true,
    description:
      "A stylish wristwatch for everyday wear or special occasions. Ask the seller about its features, materials, and warranty.",
  },
  {
    id: 7,
    name: "Residential Land",
    category: "Property",
    price: 3500,
    currency: "USD",
    location: "Bensonville, Montserrado",
    emoji: "🏡",
    color: "from-teal-100 to-cyan-200",
    condition: "For sale",
    seller: "Liberia Properties",
    featured: false,
    description:
      "A sample residential land listing. Independently verify ownership, title documents, boundaries, land use, and applicable legal requirements before paying.",
  },
  {
    id: 8,
    name: "Skincare Essentials",
    category: "Beauty",
    price: 18,
    currency: "USD",
    location: "Monrovia, Montserrado",
    emoji: "🧴",
    color: "from-pink-100 to-fuchsia-200",
    condition: "New",
    seller: "Beauty Spot",
    featured: false,
    description:
      "A sample skincare product listing. Confirm the specific products, ingredients, expiry dates, and availability with the seller.",
  },
];

export function formatPrice(
  amount: number,
  currency: "USD" | "LRD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
