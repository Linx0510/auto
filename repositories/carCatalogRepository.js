const { query } = require('../database/database');

async function listBrandsWithModels() {
  const brandsResult = await query(
    `SELECT id, name, is_other
     FROM car_brands
     ORDER BY is_other ASC, name ASC`
  );

  const modelsResult = await query(
    `SELECT id, brand_id, name, is_other
     FROM car_models
     ORDER BY is_other ASC, name ASC`
  );

  const modelsByBrand = new Map();
  for (const row of modelsResult.rows) {
    if (!modelsByBrand.has(row.brand_id)) {
      modelsByBrand.set(row.brand_id, []);
    }
    modelsByBrand.get(row.brand_id).push({
      id: row.id,
      name: row.name,
      isOther: row.is_other
    });
  }

  return brandsResult.rows.map((brand) => ({
    id: brand.id,
    name: brand.name,
    isOther: brand.is_other,
    models: modelsByBrand.get(brand.id) || []
  }));
}

async function getBrandById(brandId) {
  const result = await query(
    `SELECT id, name, is_other FROM car_brands WHERE id = $1`,
    [brandId]
  );
  return result.rows[0] || null;
}

async function getModelById(modelId) {
  const result = await query(
    `SELECT id, brand_id, name, is_other FROM car_models WHERE id = $1`,
    [modelId]
  );
  return result.rows[0] || null;
}

module.exports = {
  listBrandsWithModels,
  getBrandById,
  getModelById
};
