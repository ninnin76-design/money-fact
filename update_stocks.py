import FinanceDataReader as fdr
import json
import os

def generate_stock_list():
    try:
        print("Fetching stock listing from KRX...")
        df_krx = fdr.StockListing('KRX')
        stocks = []
        for idx, row in df_krx.iterrows():
            code = str(row['Code'])
            name = str(row['Name'])
            stocks.append({"code": code, "name": name})
        
        print(f"Successfully fetched {len(stocks)} stocks.")
        
        # 1. Update server/popular_stocks.js
        server_path = r'd:\EUNHEE\mcp\server\popular_stocks.js'
        with open(server_path, 'w', encoding='utf-8') as f:
            f.write('module.exports = ' + json.dumps(stocks, ensure_ascii=False, indent=4) + ';')
        print(f"Updated {server_path}")

        # 2. Update mobile/src/constants/StockData.js
        mobile_path = r'd:\EUNHEE\mcp\mobile\src\constants\StockData.js'
        with open(mobile_path, 'w', encoding='utf-8') as f:
            f.write('export const ALL_STOCKS = ' + json.dumps(stocks, ensure_ascii=False, indent=4) + ';')
        print(f"Updated {mobile_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_stock_list()
