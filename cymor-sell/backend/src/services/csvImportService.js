const { parse } = require('csv-parse/sync');
const Product = require('../models/Product');
const Category = require('../models/Category');

const REQUIRED_COLUMNS = ['name', 'price'];

// Parses + validates a CSV buffer. Returns { validRows, errors } without writing anything -
// used for the preview step. `commit()` (separate call) inserts validated rows.
function parseAndValidateCsv(buffer) {
  let records;
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    const e = new Error(`Could not parse CSV: ${err.message}`);
    e.status = 400;
    throw e;
  }

  const validRows = [];
  const errors = [];

  records.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for header, +1 for 1-index
    const rowErrors = [];

    for (const col of REQUIRED_COLUMNS) {
      if (!row[col] || String(row[col]).trim() === '') {
        rowErrors.push(`Missing required field "${col}"`);
      }
    }

    const price = parseFloat(row.price);
    if (row.price !== undefined && (isNaN(price) || price < 0)) {
      rowErrors.push('Invalid price');
    }

    const stock = row.stock !== undefined && row.stock !== '' ? parseInt(row.stock, 10) : 0;
    if (row.stock !== undefined && row.stock !== '' && isNaN(stock)) {
      rowErrors.push('Invalid stock value');
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, data: row, errors: rowErrors });
      return;
    }

    validRows.push({
      name: row.name.trim(),
      description: row.description || '',
      category: row.category || '',
      price,
      stock: isNaN(stock) ? 0 : stock,
      sku: row.sku || '',
      imageUrl: row.image || '',
      size: row.size || '',
      color: row.color || '',
    });
  });

  return { validRows, errors, totalRows: records.length };
}

async function commitImport({ businessId, validRows }) {
  const categoryCache = new Map();
  const inserted = [];

  for (const row of validRows) {
    let categoryId = null;
    if (row.category) {
      const key = row.category.toLowerCase();
      if (categoryCache.has(key)) {
        categoryId = categoryCache.get(key);
      } else {
        const cat = await Category.findOneAndUpdate(
          { business: businessId, name: row.category },
          { $setOnInsert: { business: businessId, name: row.category } },
          { upsert: true, new: true }
        );
        categoryId = cat._id;
        categoryCache.set(key, categoryId);
      }
    }

    const variations = [];
    if (row.size) variations.push({ type: 'size', options: row.size.split('|').map((s) => s.trim()) });
    if (row.color) variations.push({ type: 'color', options: row.color.split('|').map((s) => s.trim()) });

    const product = await Product.create({
      business: businessId,
      name: row.name,
      description: row.description,
      category: categoryId,
      price: row.price,
      stock: row.stock,
      sku: row.sku,
      image: row.imageUrl ? { url: row.imageUrl } : undefined,
      variations,
    });
    inserted.push(product);
  }

  return inserted;
}

module.exports = { parseAndValidateCsv, commitImport };
