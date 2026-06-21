import { db } from "./database";
import * as schema from "./database/schema";

async function seed() {
  console.log("Seeding database...");

  // Branch
  const [branch] = await db.insert(schema.branches).values({
    name: "iDine Main Branch",
    address: "123 Main Street, Colombo",
    phone: "+94 11 234 5678",
    isActive: true,
  }).returning();
  console.log("Branch created:", branch.id);

  // Users
  await db.insert(schema.users).values([
    { branchId: branch.id, name: "Super Admin", pin: "0000", role: "superadmin" },
    { branchId: branch.id, name: "Manager", pin: "1111", role: "manager" },
    { branchId: branch.id, name: "Waiter 1", pin: "1234", role: "waiter" },
    { branchId: branch.id, name: "Waiter 2", pin: "5678", role: "waiter" },
    { branchId: branch.id, name: "Kitchen", pin: "9999", role: "kitchen" },
  ]);

  // Printers
  const [kotKitchen1] = await db.insert(schema.printers).values({
    branchId: branch.id, name: "Kitchen Hot", type: "kot", connection: "lan", ipAddress: "192.168.1.50", port: 9100,
  }).returning();
  const [kotKitchen2] = await db.insert(schema.printers).values({
    branchId: branch.id, name: "Kitchen Cold", type: "kot", connection: "lan", ipAddress: "192.168.1.51", port: 9100,
  }).returning();
  const [kotBar] = await db.insert(schema.printers).values({
    branchId: branch.id, name: "Bar", type: "kot", connection: "lan", ipAddress: "192.168.1.52", port: 9100,
  }).returning();
  const [billPrinter] = await db.insert(schema.printers).values({
    branchId: branch.id, name: "Billing Printer", type: "bill", connection: "usb",
  }).returning();

  // Categories
  const catData = [
    { branchId: branch.id, name: "Chicken Gravy", sortOrder: 1 },
    { branchId: branch.id, name: "Noodles", sortOrder: 2 },
    { branchId: branch.id, name: "Parotta Rotti", sortOrder: 3 },
    { branchId: branch.id, name: "Naan", sortOrder: 4 },
    { branchId: branch.id, name: "Kottu", sortOrder: 5 },
    { branchId: branch.id, name: "Fried Rice", sortOrder: 6 },
    { branyId: branch.id, name: "Biriyani", sortOrder: 7 },
    { branchId: branch.id, name: "Beverages", sortOrder: 8 },
  ];
  const cats = await db.insert(schema.categories).values([
    { branchId: branch.id, name: "Chicken Gravy", sortOrder: 1 },
    { branchId: branch.id, name: "Noodles", sortOrder: 2 },
    { branchId: branch.id, name: "Parotta Rotti", sortOrder: 3 },
    { branchId: branch.id, name: "Naan", sortOrder: 4 },
    { branchId: branch.id, name: "Kottu", sortOrder: 5 },
    { branchId: branch.id, name: "Fried Rice", sortOrder: 6 },
    { branchId: branch.id, name: "Biriyani", sortOrder: 7 },
    { branchId: branch.id, name: "Beverages", sortOrder: 8 },
  ]).returning();

  const [chicken, noodles, parotta, naan, kottu, friedRice, biriyani, beverages] = cats;

  // Menu Items
  await db.insert(schema.menuItems).values([
    // Chicken Gravy → Kitchen Hot
    { branchId: branch.id, categoryId: chicken.id, printerId: kotKitchen1.id, name: "Chicken Curry", price: 950, isVeg: false },
    { branchId: branch.id, categoryId: chicken.id, printerId: kotKitchen1.id, name: "Butter Chicken", price: 1200, isVeg: false },
    { branchId: branch.id, categoryId: chicken.id, printerId: kotKitchen1.id, name: "Chicken Tikka", price: 1350, isVeg: false },
    // Noodles → Kitchen Cold
    { branchId: branch.id, categoryId: noodles.id, printerId: kotKitchen2.id, name: "Veg Noodles", price: 850, isVeg: true },
    { branchId: branch.id, categoryId: noodles.id, printerId: kotKitchen2.id, name: "Chicken Noodles", price: 1150, isVeg: false },
    { branchId: branch.id, categoryId: noodles.id, printerId: kotKitchen2.id, name: "Egg Noodles", price: 850, isVeg: false },
    { branchId: branch.id, categoryId: noodles.id, printerId: kotKitchen2.id, name: "Seafood Noodles", price: 1550, isVeg: false },
    { branchId: branch.id, categoryId: noodles.id, printerId: kotKitchen2.id, name: "Mutton Noodles", price: 1550, isVeg: false },
    // Parotta
    { branchId: branch.id, categoryId: parotta.id, printerId: kotKitchen1.id, name: "Plain Parotta", price: 120, isVeg: true },
    { branchId: branch.id, categoryId: parotta.id, printerId: kotKitchen1.id, name: "Egg Parotta", price: 220, isVeg: false },
    // Naan
    { branchId: branch.id, categoryId: naan.id, printerId: kotKitchen1.id, name: "Plain Naan", price: 150, isVeg: true },
    { branchId: branch.id, categoryId: naan.id, printerId: kotKitchen1.id, name: "Butter Naan", price: 200, isVeg: true },
    { branchId: branch.id, categoryId: naan.id, printerId: kotKitchen1.id, name: "Garlic Naan", price: 220, isVeg: true },
    // Kottu
    { branchId: branch.id, categoryId: kottu.id, printerId: kotKitchen1.id, name: "Veg Kottu", price: 750, isVeg: true },
    { branchId: branch.id, categoryId: kottu.id, printerId: kotKitchen1.id, name: "Chicken Kottu", price: 950, isVeg: false },
    { branchId: branch.id, categoryId: kottu.id, printerId: kotKitchen1.id, name: "Mutton Kottu", price: 1150, isVeg: false },
    // Fried Rice
    { branchId: branch.id, categoryId: friedRice.id, printerId: kotKitchen2.id, name: "Veg Fried Rice", price: 850, isVeg: true },
    { branchId: branch.id, categoryId: friedRice.id, printerId: kotKitchen2.id, name: "Chicken Fried Rice", price: 1050, isVeg: false },
    { branchId: branch.id, categoryId: friedRice.id, printerId: kotKitchen2.id, name: "Egg Fried Rice", price: 900, isVeg: false },
    // Biriyani
    { branchId: branch.id, categoryId: biriyani.id, printerId: kotKitchen1.id, name: "Chicken Biriyani", price: 1350, isVeg: false },
    { branchId: branch.id, categoryId: biriyani.id, printerId: kotKitchen1.id, name: "Mutton Biriyani", price: 1650, isVeg: false },
    // Beverages → Bar printer
    { branchId: branch.id, categoryId: beverages.id, printerId: kotBar.id, name: "Mango Juice", price: 350, isVeg: true, isBeverage: true },
    { branchId: branch.id, categoryId: beverages.id, printerId: kotBar.id, name: "Lime Juice", price: 280, isVeg: true, isBeverage: true },
    { branchId: branch.id, categoryId: beverages.id, printerId: kotBar.id, name: "Mojito", price: 450, isVeg: true, isBeverage: true },
    { branchId: branch.id, categoryId: beverages.id, printerId: kotBar.id, name: "Lassi", price: 320, isVeg: true, isBeverage: true },
    { branchId: branch.id, categoryId: beverages.id, printerId: kotBar.id, name: "Tea", price: 150, isVeg: true, isBeverage: true },
    { branchId: branch.id, categoryId: beverages.id, printerId: kotBar.id, name: "Coffee", price: 200, isVeg: true, isBeverage: true },
  ]);

  // Tables
  await db.insert(schema.tables).values(
    Array.from({ length: 12 }, (_, i) => ({
      branchId: branch.id,
      name: `T${i + 1}`,
      capacity: i < 4 ? 2 : i < 8 ? 4 : 6,
    }))
  );

  console.log("Seed complete!");
}

seed().catch(console.error);
