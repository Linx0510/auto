function buildCarModelDisplay({
  brandName,
  modelName,
  customBrand,
  customModel,
  brandIsOther,
  modelIsOther
}) {
  const brand = brandIsOther ? customBrand : brandName;
  const model = modelIsOther ? customModel : modelName;
  return [brand, model].filter(Boolean).join(' ').trim();
}

function validateRequestCarPayload({ brand, model, customBrand, customModel }) {
  if (!brand) {
    return { error: 'Укажите марку автомобиля' };
  }

  const trimmedCustomBrand = customBrand ? String(customBrand).trim() : '';
  const trimmedCustomModel = customModel ? String(customModel).trim() : '';

  if (brand.is_other) {
    if (!trimmedCustomBrand) {
      return { error: 'Укажите марку автомобиля вручную' };
    }
    if (!trimmedCustomModel) {
      return { error: 'Укажите модель автомобиля вручную' };
    }

    return {
      carBrandId: brand.id,
      carModelId: model ? model.id : null,
      customBrand: trimmedCustomBrand,
      customModel: trimmedCustomModel,
      carModelDisplay: buildCarModelDisplay({
        brandName: brand.name,
        modelName: model ? model.name : '',
        customBrand: trimmedCustomBrand,
        customModel: trimmedCustomModel,
        brandIsOther: true,
        modelIsOther: model ? model.is_other : true
      })
    };
  }

  if (!model) {
    return { error: 'Укажите модель автомобиля' };
  }

  if (model.brand_id !== brand.id) {
    return { error: 'Модель не соответствует выбранной марке' };
  }

  if (model.is_other) {
    if (!trimmedCustomModel) {
      return { error: 'Укажите модель автомобиля вручную' };
    }

    return {
      carBrandId: brand.id,
      carModelId: model.id,
      customBrand: null,
      customModel: trimmedCustomModel,
      carModelDisplay: buildCarModelDisplay({
        brandName: brand.name,
        modelName: model.name,
        customBrand: null,
        customModel: trimmedCustomModel,
        brandIsOther: false,
        modelIsOther: true
      })
    };
  }

  if (trimmedCustomBrand || trimmedCustomModel) {
    return { error: 'Поля ручного ввода не используются при выборе из списка' };
  }

  return {
    carBrandId: brand.id,
    carModelId: model.id,
    customBrand: null,
    customModel: null,
    carModelDisplay: buildCarModelDisplay({
      brandName: brand.name,
      modelName: model.name,
      customBrand: null,
      customModel: null,
      brandIsOther: false,
      modelIsOther: false
    })
  };
}

module.exports = {
  buildCarModelDisplay,
  validateRequestCarPayload
};
