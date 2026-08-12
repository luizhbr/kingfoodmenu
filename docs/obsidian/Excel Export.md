[[00 - Home]]

# Excel Export

## P9 — Excel Export (PASS 2026-08-12)

- **Biblioteca:** exceljs (MIT)
- **Endpoint:** GET /api/reports/export (MANAGER+)
- **10 abas:** Summary, Sales, Orders, Products, Categories, Marketing, Loyalty, Cashback, Delivery, Drivers
- **Validações:** custom sem data/range invertido → 400
- **Formatação:** moeda, percentual, autofilter, freeze
- **Arquitetura:** Reports calcula → Excel exporta (mesma camada de dados)
- **Filename:** king-food-report-YYYY-MM-DD.xlsx
- **Cross-check:** XLSX == API == Neon ✅
- **PROFIT/CMV:** fora do escopo

Ver [[Reports]] e [[00 - Home]].
