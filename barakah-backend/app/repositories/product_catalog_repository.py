"""
Product catalog repository — global category-based product-name directory.
Used to power controlled product-name dropdowns for shop owners.
"""

from datetime import datetime, timezone
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import UpdateOne

from app.core.logging import get_logger

logger = get_logger(__name__)

_COLLECTION = "product_catalog"

_DEFAULT_PRODUCT_CATALOG: dict[str, list[str]] = {
    "Rice": [
        "Miniket Rice",
        "Nazirshail Rice",
        "Chinigura Rice",
        "Basmati Rice",
        "Kalijira Rice",
        "Parboiled Rice",
    ],
    "Lentils": [
        "Red Lentils (Masoor Dal)",
        "Mung Dal",
        "Chana Dal",
        "Black Gram (Mashkalai)",
        "Split Peas Dal",
    ],
    "Oil": [
        "Soybean Oil",
        "Mustard Oil",
        "Sunflower Oil",
        "Olive Oil",
        "Rice Bran Oil",
    ],
    "Spices": [
        "Turmeric Powder",
        "Red Chili Powder",
        "Coriander Powder",
        "Cumin Powder",
        "Garam Masala",
        "Black Pepper",
    ],
    "Flour": [
        "Atta Flour",
        "Maida Flour",
        "Besan Flour",
        "Rice Flour",
        "Semolina (Suji)",
    ],
    "Sugar": [
        "Refined Sugar",
        "Brown Sugar",
        "Jaggery",
        "Sugar Cubes",
    ],
    "Salt": [
        "Iodized Salt",
        "Sea Salt",
        "Rock Salt",
    ],
    "Tea": [
        "Black Tea",
        "Green Tea",
        "Masala Tea",
        "Herbal Tea",
    ],
    "Milk": [
        "Fresh Milk",
        "UHT Milk",
        "Powder Milk",
        "Condensed Milk",
    ],
    "Eggs": [
        "Chicken Eggs (Dozen)",
        "Duck Eggs (Dozen)",
        "Organic Eggs",
    ],
    "Vegetables": [
        "Potato",
        "Onion",
        "Tomato",
        "Green Chili",
        "Cauliflower",
        "Cabbage",
        "Eggplant",
        "Spinach",
    ],
    "Fruits": [
        "Banana",
        "Apple",
        "Orange",
        "Mango",
        "Papaya",
        "Guava",
        "Pomegranate",
    ],
    "Fish": [
        "Hilsa Fish",
        "Rui Fish",
        "Katla Fish",
        "Tilapia Fish",
        "Pangas Fish",
    ],
    "Meat": [
        "Chicken Broiler",
        "Chicken Deshi",
        "Beef",
        "Mutton",
    ],
    "Snacks": [
        "Potato Chips",
        "Biscuits",
        "Chanachur",
        "Noodles",
        "Crackers",
    ],
    "Beverages": [
        "Mineral Water",
        "Soft Drink",
        "Fruit Juice",
        "Energy Drink",
    ],
    "Cleaning": [
        "Dishwashing Liquid",
        "Laundry Detergent",
        "Floor Cleaner",
        "Glass Cleaner",
        "Bleach",
    ],
    "Personal Care": [
        "Soap",
        "Shampoo",
        "Toothpaste",
        "Toothbrush",
        "Body Lotion",
        "Face Wash",
    ],
    "Baby Products": [
        "Baby Diapers",
        "Baby Wipes",
        "Baby Powder",
        "Baby Lotion",
        "Infant Formula",
    ],
    "Other": [
        "Battery",
        "Candle",
        "Matchbox",
        "Tissue Paper",
    ],
}


class ProductCatalogRepository:
    """Data-access layer for the product_catalog collection."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db[_COLLECTION]

    async def add_name(self, category: str, name: str) -> dict:
        """Insert one global product name under a category."""
        now = datetime.now(timezone.utc)
        doc = {
            "category": category,
            "name": name,
            "category_key": category.strip().lower(),
            "name_key": name.strip().lower(),
            "created_at": now,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    async def exists_name(self, category: str, name: str) -> bool:
        """Check if a normalized category/name exists in global catalog."""
        found = await self.collection.find_one(
            {
                "category_key": category.strip().lower(),
                "name_key": name.strip().lower(),
            },
            {"_id": 1},
        )
        return found is not None

    async def list_names_by_category(self, category: str) -> List[str]:
        """Return all names for one category from global catalog."""
        cursor = self.collection.find(
            {"category_key": category.strip().lower()},
            {"name": 1},
        ).sort("name", 1)

        names = []
        async for doc in cursor:
            name = (doc.get("name") or "").strip()
            if name:
                names.append(name)
        return names

    async def list_categories(self) -> List[str]:
        """Return distinct categories from global catalog."""
        categories = await self.collection.distinct("category")
        return sorted([c for c in categories if isinstance(c, str) and c.strip()], key=str.lower)

    async def ensure_indexes(self) -> None:
        """Create required indexes for efficient lookups and uniqueness."""
        await self.collection.create_index(
            [("category_key", 1), ("name_key", 1)],
            unique=True,
        )
        await self.collection.create_index("category_key")
        await self.collection.create_index("name_key")
        logger.info("Product catalog collection indexes ensured.")

    async def seed_default_catalog(self) -> None:
        """Seed built-in category product names once (idempotent upsert)."""
        now = datetime.now(timezone.utc)
        operations = []

        for category, names in _DEFAULT_PRODUCT_CATALOG.items():
            category_clean = category.strip()
            category_key = category_clean.lower()
            for name in names:
                name_clean = name.strip()
                if not name_clean:
                    continue

                operations.append(
                    UpdateOne(
                        {
                            "category_key": category_key,
                            "name_key": name_clean.lower(),
                        },
                        {
                            "$setOnInsert": {
                                "category": category_clean,
                                "name": name_clean,
                                "category_key": category_key,
                                "name_key": name_clean.lower(),
                                "created_at": now,
                            }
                        },
                        upsert=True,
                    )
                )

        if not operations:
            return

        result = await self.collection.bulk_write(operations, ordered=False)
        inserted = getattr(result, "upserted_count", 0)
        if inserted:
            logger.info("Seeded %d default product catalog entries.", inserted)
