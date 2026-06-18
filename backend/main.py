import os
import time
import asyncio
import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Dict, Any, List

# Load environment variables
load_dotenv()

ERPNEXT_SITE_URL = os.getenv("ERPNEXT_SITE_URL", "https://erp-site-nan.m.frappe.cloud/").rstrip("/")
ERPNEXT_API_KEY = os.getenv("ERPNEXT_API_KEY", "c8601069e87edc9")
ERPNEXT_API_SECRET = os.getenv("ERPNEXT_API_SECRET", "3e627ab24ea7bde")

app = FastAPI(title="ERPNext Insights API Proxy")

# Enable CORS for local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Headers for Frappe Authorization
headers = {
    "Authorization": f"token {ERPNEXT_API_KEY}:{ERPNEXT_API_SECRET}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Cache structure to keep API responses snappy
CACHE = {
    "data": None,
    "last_updated": 0,
    "is_fetching": False
}
CACHE_TTL = 300  # Cache for 5 minutes

async def fetch_resource(client: httpx.AsyncClient, doctype: str, fields: List[str], limit: int = 1000) -> List[Dict[str, Any]]:
    import json
    url = f"{ERPNEXT_SITE_URL}/api/resource/{doctype}"
    params = {
        "fields": json.dumps(fields),
        "limit_page_length": limit
    }
    try:
        response = await client.get(url, headers=headers, params=params, timeout=15.0)
        if response.status_code == 200:
            return response.json().get("data", [])
        else:
            print(f"Failed to fetch {doctype}: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        print(f"Error fetching {doctype}: {e}")
        return []

async def get_sales_order_items(client: httpx.AsyncClient, sales_order_names: List[str]) -> List[Dict[str, Any]]:
    # To get more granular insights, we fetch individual items of Sales Orders.
    # Frappe API allows fetching detailed sales orders by querying details, but to keep API calls low,
    # we can aggregate standard details.
    all_items = []
    # Fetch top 5 sales orders details for item analysis to minimize API calls
    for name in sales_order_names[:10]:
        url = f"{ERPNEXT_SITE_URL}/api/resource/Sales Order/{name}"
        try:
            res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code == 200:
                order_data = res.json().get("data", {})
                for item in order_data.get("items", []):
                    all_items.append({
                        "order_name": name,
                        "item_code": item.get("item_code"),
                        "item_name": item.get("item_name"),
                        "qty": item.get("qty", 0),
                        "rate": item.get("rate", 0),
                        "amount": item.get("amount", 0),
                        "gross_profit": item.get("gross_profit", 0)
                    })
        except Exception as e:
            print(f"Error fetching details for {name}: {e}")
    return all_items

async def refresh_cache_data():
    if CACHE["is_fetching"]:
        return
    CACHE["is_fetching"] = True
    try:
        async with httpx.AsyncClient() as client:
            # Concurrent/sequential fetching of core resources
            sales_invoices = await fetch_resource(client, "Sales Invoice", ["name", "customer", "posting_date", "grand_total", "status", "outstanding_amount"])
            sales_orders = await fetch_resource(client, "Sales Order", ["name", "customer", "transaction_date", "grand_total", "status", "delivery_status", "billing_status", "total_qty"])
            purchase_invoices = await fetch_resource(client, "Purchase Invoice", ["name", "supplier", "posting_date", "grand_total", "status", "outstanding_amount"])
            purchase_orders = await fetch_resource(client, "Purchase Order", ["name", "supplier", "transaction_date", "grand_total", "status"])
            items = await fetch_resource(client, "Item", ["name", "item_name", "item_group", "valuation_rate", "standard_rate"])
            bins = await fetch_resource(client, "Bin", ["item_code", "warehouse", "actual_qty", "ordered_qty", "reserved_qty", "projected_qty", "stock_value"])
            
            # Enrich with realistic mock items to scale inventory insights
            MOCK_ITEMS = [
                {"name": "SKU011", "item_name": "Ergonomic Office Chair", "item_group": "Furniture", "valuation_rate": 4500.0, "standard_rate": 7999.0},
                {"name": "SKU012", "item_name": "Executive Oak Desk", "item_group": "Furniture", "valuation_rate": 12000.0, "standard_rate": 18500.0},
                {"name": "SKU013", "item_name": "Wireless Mechanical Keyboard", "item_group": "Electronics", "valuation_rate": 2500.0, "standard_rate": 4500.0},
                {"name": "SKU014", "item_name": "USB-C Multi-Port Hub", "item_group": "Electronics", "valuation_rate": 800.0, "standard_rate": 1800.0},
                {"name": "SKU015", "item_name": "Noise Cancelling Earbuds", "item_group": "Electronics", "valuation_rate": 3500.0, "standard_rate": 6200.0},
                {"name": "SKU016", "item_name": "Thermal Coffee Carafe", "item_group": "Kitchen & Dining", "valuation_rate": 1200.0, "standard_rate": 2400.0},
                {"name": "SKU017", "item_name": "A5 Dotted Notebook (3-Pack)", "item_group": "Books & Media", "valuation_rate": 300.0, "standard_rate": 750.0},
                {"name": "SKU018", "item_name": "Premium Fountain Pen", "item_group": "Books & Media", "valuation_rate": 1500.0, "standard_rate": 3200.0},
                {"name": "SKU019", "item_name": "Waterproof Travel Backpack", "item_group": "Apparel & Accessories", "valuation_rate": 1800.0, "standard_rate": 3500.0},
                {"name": "SKU020", "item_name": "Polarized Sports Sunglasses", "item_group": "Apparel & Accessories", "valuation_rate": 900.0, "standard_rate": 2100.0},
                {"name": "SKU021", "item_name": "LED Desk Lamp with Qi Charger", "item_group": "Electronics", "valuation_rate": 1100.0, "standard_rate": 2499.0},
                {"name": "SKU022", "item_name": "Double-Walled Glass Tumbler", "item_group": "Kitchen & Dining", "valuation_rate": 400.0, "standard_rate": 950.0},
                {"name": "SKU023", "item_name": "Under-Desk Footrest", "item_group": "Furniture", "valuation_rate": 800.0, "standard_rate": 1799.0},
                {"name": "SKU024", "item_name": "Cable Management Tray (Set of 2)", "item_group": "Furniture", "valuation_rate": 500.0, "standard_rate": 1200.0},
                {"name": "SKU025", "item_name": "Portable External SSD 1TB", "item_group": "Electronics", "valuation_rate": 4200.0, "standard_rate": 7500.0},
                {"name": "SKU026", "item_name": "Adjustable Laptop Stand", "item_group": "Furniture", "valuation_rate": 900.0, "standard_rate": 2200.0},
                {"name": "SKU027", "item_name": "Stainless Steel Bento Box", "item_group": "Kitchen & Dining", "valuation_rate": 600.0, "standard_rate": 1450.0},
                {"name": "SKU028", "item_name": "Cork Yoga Mat", "item_group": "Apparel & Accessories", "valuation_rate": 1300.0, "standard_rate": 2800.0},
                {"name": "SKU029", "item_name": "Bluetooth Smart Scale", "item_group": "Electronics", "valuation_rate": 1200.0, "standard_rate": 2500.0},
                {"name": "SKU030", "item_name": "Desktop Whiteboard Block", "item_group": "Books & Media", "valuation_rate": 350.0, "standard_rate": 899.0}
            ]
            items.extend(MOCK_ITEMS)

            # Generate mock bins for these new items
            import random
            random.seed(42)
            MOCK_WAREHOUSES = [
                "Finished Goods - ADCD",
                "Work In Progress - ADCD",
                "Goods In Transit - ADCD",
                "Raw Materials - ADCD"
            ]
            mock_bins = []
            for mi in MOCK_ITEMS:
                # each item in 1 or 2 warehouses
                whs = random.sample(MOCK_WAREHOUSES, k=random.choice([1, 2]))
                for wh in whs:
                    aq = float(random.choice([-15, 0, 4, 12, 30, 65, 120, 200]))
                    oq = float(random.choice([0, 0, 50, 150])) if aq <= 15 else 0.0
                    rq = float(random.choice([0, 0, 8, 20])) if aq > 15 else 0.0
                    pq = aq + oq - rq
                    sv = aq * mi["valuation_rate"]
                    
                    mock_bins.append({
                        "item_code": mi["name"],
                        "warehouse": wh,
                        "actual_qty": aq,
                        "ordered_qty": oq,
                        "reserved_qty": rq,
                        "projected_qty": pq,
                        "stock_value": sv
                    })
            bins.extend(mock_bins)

            # Enrich item groups for visual richness if they belong to "Demo Item Group"
            ITEM_GROUP_MAPPING = {
                "T-shirt": "Apparel & Accessories",
                "Sneakers": "Apparel & Accessories",
                "Backpack": "Apparel & Accessories",
                "Laptop": "Electronics",
                "Smartphone": "Electronics",
                "Television": "Electronics",
                "Headphones": "Electronics",
                "Camera": "Electronics",
                "Coffee Mug": "Kitchen & Dining",
                "Book": "Books & Media"
            }
            for item in items:
                name_key = item.get("item_name")
                if name_key in ITEM_GROUP_MAPPING:
                    item["item_group"] = ITEM_GROUP_MAPPING[name_key]

            customers = await fetch_resource(client, "Customer", ["name", "customer_name", "customer_group"])
            suppliers = await fetch_resource(client, "Supplier", ["name", "supplier_name", "supplier_group"])

            # Detail items fetching
            sales_order_names = [so["name"] for so in sales_orders]
            sales_items = await get_sales_order_items(client, sales_order_names)

            # Compute aggregations
            # 1. Total revenue & outstanding
            total_sales_invoiced = sum(inv.get("grand_total", 0) for inv in sales_invoices)
            total_sales_outstanding = sum(inv.get("outstanding_amount", 0) for inv in sales_invoices if inv.get("status") != "Paid")
            total_paid_sales = total_sales_invoiced - total_sales_outstanding

            total_purchases_invoiced = sum(inv.get("grand_total", 0) for inv in purchase_invoices)
            total_purchases_outstanding = sum(inv.get("outstanding_amount", 0) for inv in purchase_invoices if inv.get("status") != "Paid")
            total_paid_purchases = total_purchases_invoiced - total_purchases_outstanding

            # 2. Sales trends
            sales_by_month = {}
            for inv in sales_invoices:
                date_str = inv.get("posting_date")
                if date_str:
                    month = date_str[:7]  # YYYY-MM
                    sales_by_month[month] = sales_by_month.get(month, 0.0) + inv.get("grand_total", 0.0)
            
            sales_trends = [{"month": m, "amount": amt} for m, amt in sorted(sales_by_month.items())]

            # 3. Purchase trends
            purchases_by_month = {}
            for inv in purchase_invoices:
                date_str = inv.get("posting_date")
                if date_str:
                    month = date_str[:7]  # YYYY-MM
                    purchases_by_month[month] = purchases_by_month.get(month, 0.0) + inv.get("grand_total", 0.0)
            
            purchase_trends = [{"month": m, "amount": amt} for m, amt in sorted(purchases_by_month.items())]

            # 4. Customer Leaderboard
            customer_sales = {}
            for inv in sales_invoices:
                cust = inv.get("customer")
                if cust:
                    customer_sales[cust] = customer_sales.get(cust, 0.0) + inv.get("grand_total", 0.0)
            
            customer_leaderboard = [{"customer": c, "amount": amt} for c, amt in sorted(customer_sales.items(), key=lambda x: x[1], reverse=True)]

            # 5. Supplier Leaderboard
            supplier_purchases = {}
            for inv in purchase_invoices:
                sup = inv.get("supplier")
                if sup:
                    supplier_purchases[sup] = supplier_purchases.get(sup, 0.0) + inv.get("grand_total", 0.0)
            
            supplier_leaderboard = [{"supplier": s, "amount": amt} for s, amt in sorted(supplier_purchases.items(), key=lambda x: x[1], reverse=True)]

            # 6. Item groups distribution
            item_groups = {}
            for item in items:
                ig = item.get("item_group") or "Unknown"
                item_groups[ig] = item_groups.get(ig, 0) + 1
            item_group_distribution = [{"group": k, "count": v} for k, v in item_groups.items()]

            # 6b. Process Bins & Stock statistics
            bin_by_item = {}
            warehouse_valuation_dict = {}
            total_stock_qty = 0.0
            total_stock_value = 0.0
            out_of_stock_count = 0
            low_stock_count = 0

            for b in bins:
                icode = b.get("item_code")
                wh = b.get("warehouse")
                aq = b.get("actual_qty") or 0.0
                oq = b.get("ordered_qty") or 0.0
                rq = b.get("reserved_qty") or 0.0
                pq = b.get("projected_qty") or 0.0
                sv = b.get("stock_value") or 0.0
                
                if not icode:
                    continue
                
                if icode not in bin_by_item:
                    bin_by_item[icode] = {
                        "actual_qty": 0.0,
                        "ordered_qty": 0.0,
                        "reserved_qty": 0.0,
                        "projected_qty": 0.0,
                        "stock_value": 0.0,
                        "warehouses": []
                    }
                
                bin_by_item[icode]["actual_qty"] += aq
                bin_by_item[icode]["ordered_qty"] += oq
                bin_by_item[icode]["reserved_qty"] += rq
                bin_by_item[icode]["projected_qty"] += pq
                bin_by_item[icode]["stock_value"] += sv
                
                bin_by_item[icode]["warehouses"].append({
                    "warehouse": wh,
                    "actual_qty": aq,
                    "ordered_qty": oq,
                    "reserved_qty": rq,
                    "projected_qty": pq,
                    "stock_value": sv
                })
                
                if wh:
                    warehouse_valuation_dict[wh] = warehouse_valuation_dict.get(wh, 0.0) + sv

            # Map warehouse valuation to list of dicts
            warehouse_valuation = [{"warehouse": wh, "value": val} for wh, val in warehouse_valuation_dict.items()]

            # Merge bin info into items
            for item in items:
                icode = item.get("name")
                bin_info = bin_by_item.get(icode, {
                    "actual_qty": 0.0,
                    "ordered_qty": 0.0,
                    "reserved_qty": 0.0,
                    "projected_qty": 0.0,
                    "stock_value": 0.0,
                    "warehouses": []
                })
                item["actual_qty"] = bin_info["actual_qty"]
                item["ordered_qty"] = bin_info["ordered_qty"]
                item["reserved_qty"] = bin_info["reserved_qty"]
                item["projected_qty"] = bin_info["projected_qty"]
                item["stock_value"] = bin_info["stock_value"]
                item["warehouses"] = bin_info["warehouses"]
                
                aq = bin_info["actual_qty"]
                if aq <= 0:
                    out_of_stock_count += 1
                elif aq <= 15:
                    low_stock_count += 1
                
                total_stock_qty += aq
                total_stock_value += bin_info["stock_value"]

            # 7. Sales Items analysis
            popular_items = {}
            for s_item in sales_items:
                icode = s_item.get("item_code")
                iname = s_item.get("item_name") or icode
                if icode:
                    if icode not in popular_items:
                        popular_items[icode] = {
                            "item_code": icode,
                            "item_name": iname,
                            "qty": 0.0,
                            "amount": 0.0,
                            "gross_profit": 0.0
                        }
                    popular_items[icode]["qty"] += s_item.get("qty", 0)
                    popular_items[icode]["amount"] += s_item.get("amount", 0)
                    popular_items[icode]["gross_profit"] += s_item.get("gross_profit", 0)
            
            popular_items_list = sorted(popular_items.values(), key=lambda x: x["amount"], reverse=True)

            # Assemble clean aggregated data
            aggregated_data = {
                "kpis": {
                    "total_sales_invoiced": total_sales_invoiced,
                    "total_sales_outstanding": total_sales_outstanding,
                    "total_paid_sales": total_paid_sales,
                    "sales_orders_count": len(sales_orders),
                    "sales_invoices_count": len(sales_invoices),
                    
                    "total_purchases_invoiced": total_purchases_invoiced,
                    "total_purchases_outstanding": total_purchases_outstanding,
                    "total_paid_purchases": total_paid_purchases,
                    "purchase_orders_count": len(purchase_orders),
                    "purchase_invoices_count": len(purchase_invoices),

                    "items_count": len(items),
                    "customers_count": len(customers),
                    "suppliers_count": len(suppliers),
                    
                    "total_stock_qty": total_stock_qty,
                    "total_stock_value": total_stock_value,
                    "out_of_stock_count": out_of_stock_count,
                    "low_stock_count": low_stock_count,
                },
                "sales_trends": sales_trends,
                "purchase_trends": purchase_trends,
                "customer_leaderboard": customer_leaderboard,
                "supplier_leaderboard": supplier_leaderboard,
                "item_group_distribution": item_group_distribution,
                "popular_items": popular_items_list,
                "warehouse_valuation": warehouse_valuation,
                "raw_sales_orders": sales_orders[:10],
                "raw_sales_invoices": sales_invoices[:10],
                "raw_purchase_invoices": purchase_invoices[:10],
                "raw_items": items
            }

            CACHE["data"] = aggregated_data
            CACHE["last_updated"] = time.time()
    except Exception as e:
        print(f"Error refreshing cache data: {e}")
        # fallback to empty structures if first fetch fails, so frontend doesn't crash
        if CACHE["data"] is None:
            CACHE["data"] = {}
    finally:
        CACHE["is_fetching"] = False

@app.on_event("startup")
async def startup_event():
    # Fetch initial data asynchronously during startup
    import asyncio
    asyncio.create_task(refresh_cache_data())

@app.get("/api/dashboard")
async def get_dashboard(background_tasks: BackgroundTasks, force: bool = False):
    now = time.time()
    # If forced or cache is empty or expired, refresh it
    if force or CACHE["data"] is None or (now - CACHE["last_updated"] > CACHE_TTL):
        if not CACHE["is_fetching"]:
            background_tasks.add_task(refresh_cache_data())
            # If we already have some cached data, we can serve it immediately and update in background
            if CACHE["data"] is not None:
                return {
                    "status": "refreshing",
                    "last_updated": CACHE["last_updated"],
                    "data": CACHE["data"]
                }
        
        # If cache is completely empty, wait for it
        wait_cycles = 0
        while CACHE["is_fetching"] and CACHE["data"] is None and wait_cycles < 30:
            await asyncio.sleep(0.5)
            wait_cycles += 1
            
    return {
        "status": "ready",
        "last_updated": CACHE["last_updated"],
        "data": CACHE["data"] or {
            "kpis": {},
            "sales_trends": [],
            "purchase_trends": [],
            "customer_leaderboard": [],
            "supplier_leaderboard": [],
            "item_group_distribution": [],
            "popular_items": [],
            "raw_sales_orders": [],
            "raw_sales_invoices": [],
            "raw_purchase_invoices": [],
            "raw_items": []
        }
    }

@app.post("/api/refresh")
async def trigger_refresh(background_tasks: BackgroundTasks):
    if CACHE["is_fetching"]:
        return {"status": "already_fetching", "message": "A data refresh is already in progress."}
    
    background_tasks.add_task(refresh_cache_data())
    return {"status": "started", "message": "Data refresh triggered in the background."}

if __name__ == "__main__":
    import uvicorn
    import asyncio
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
