const CAR_BRANDS_CACHE_KEY = 'autoservice_car_brands';

async function fetchCarBrandsCatalog() {
  const cached = sessionStorage.getItem(CAR_BRANDS_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      sessionStorage.removeItem(CAR_BRANDS_CACHE_KEY);
    }
  }

  const response = await fetch('/api/car-brands');
  if (!response.ok) {
    throw new Error('Не удалось загрузить справочник автомобилей');
  }

  const brands = await response.json();
  sessionStorage.setItem(CAR_BRANDS_CACHE_KEY, JSON.stringify(brands));
  return brands;
}

function initCarSelectForm(root) {
  const brandMount = root.querySelector('[data-car-brand-mount]');
  const modelMount = root.querySelector('[data-car-model-mount]');
  const customBrandWrap = root.querySelector('[data-custom-brand-wrap]');
  const customModelWrap = root.querySelector('[data-custom-model-wrap]');
  const customBrandInput = root.querySelector('[data-custom-brand]');
  const customModelInput = root.querySelector('[data-custom-model]');

  if (!brandMount || !modelMount) {
    throw new Error('Car select form: missing mount elements');
  }

  const brandSelect = new SearchableSelect(brandMount, {
    placeholder: 'Выберите марку...',
    onChange: onBrandChange
  });

  const modelSelect = new SearchableSelect(modelMount, {
    placeholder: 'Сначала выберите марку',
    disabled: true,
    onChange: onModelChange
  });

  let catalog = [];
  let currentBrand = null;

  function onBrandChange(value) {
    currentBrand = value;
    customBrandWrap.hidden = true;
    customModelWrap.hidden = true;
    if (customBrandInput) {
      customBrandInput.value = '';
      customBrandInput.required = false;
    }
    if (customModelInput) {
      customModelInput.value = '';
      customModelInput.required = false;
    }

    modelSelect.clear();

    if (!value) {
      modelSelect.setItems([]);
      modelSelect.setDisabled(true);
      modelSelect.input.placeholder = 'Сначала выберите марку';
      return;
    }

    if (value.isOther) {
      modelSelect.setItems([]);
      modelSelect.setDisabled(true);
      customBrandWrap.hidden = false;
      customModelWrap.hidden = false;
      if (customBrandInput) {
        customBrandInput.required = true;
      }
      if (customModelInput) {
        customModelInput.required = true;
      }
      return;
    }

    const brand = catalog.find((entry) => String(entry.id) === String(value.id));
    const models = brand && Array.isArray(brand.models) ? brand.models : [];
    modelSelect.setItems(models);
    modelSelect.setDisabled(false);
    modelSelect.input.placeholder = 'Выберите модель...';
  }

  function onModelChange(value) {
    customModelWrap.hidden = true;
    if (customModelInput) {
      customModelInput.value = '';
      customModelInput.required = false;
    }

    if (!value || !currentBrand || currentBrand.isOther) {
      return;
    }

    if (value.isOther) {
      customModelWrap.hidden = false;
      if (customModelInput) {
        customModelInput.required = true;
      }
    }
  }

  const ready = fetchCarBrandsCatalog()
    .then((brands) => {
      catalog = brands;
      brandSelect.setItems(brands);
    })
    .catch((error) => {
      console.error(error);
      if (typeof showNotification === 'function') {
        showNotification('Не удалось загрузить марки автомобилей', 'error');
      }
    });

  return {
    ready,
    validate() {
      const brand = brandSelect.getValue();
      if (!brand) {
        return 'Выберите марку автомобиля';
      }

      if (brand.isOther) {
        const customBrand = customBrandInput ? customBrandInput.value.trim() : '';
        const customModel = customModelInput ? customModelInput.value.trim() : '';
        if (!customBrand) {
          return 'Укажите марку автомобиля вручную';
        }
        if (!customModel) {
          return 'Укажите модель автомобиля вручную';
        }
        return null;
      }

      const model = modelSelect.getValue();
      if (!model) {
        return 'Выберите модель автомобиля';
      }

      if (model.isOther) {
        const customModel = customModelInput ? customModelInput.value.trim() : '';
        if (!customModel) {
          return 'Укажите модель автомобиля вручную';
        }
      }

      return null;
    },
    getPayload() {
      const brand = brandSelect.getValue();
      const model = modelSelect.getValue();

      let carModelId = model ? model.id : null;
      if (brand && brand.isOther) {
        const otherBrand = catalog.find((entry) => entry.isOther);
        const otherModel = otherBrand && Array.isArray(otherBrand.models)
          ? otherBrand.models.find((entry) => entry.isOther)
          : null;
        if (otherModel) {
          carModelId = otherModel.id;
        }
      }

      return {
        car_brand_id: brand ? brand.id : null,
        car_model_id: carModelId,
        custom_brand: customBrandInput && !customBrandWrap.hidden ? customBrandInput.value.trim() : null,
        custom_model: customModelInput && !customModelWrap.hidden ? customModelInput.value.trim() : null
      };
    },
    reset() {
      brandSelect.clear();
      modelSelect.clear();
      modelSelect.setDisabled(true);
      currentBrand = null;
      if (customBrandInput) {
        customBrandInput.value = '';
      }
      if (customModelInput) {
        customModelInput.value = '';
      }
      customBrandWrap.hidden = true;
      customModelWrap.hidden = true;
    }
  };
}

function populateBrandFilterSelect(selectEl, brands, includeAllOption) {
  if (!selectEl) {
    return;
  }

  selectEl.innerHTML = '';
  if (includeAllOption) {
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'Все марки';
    selectEl.appendChild(all);
  }

  brands
    .filter((brand) => !brand.isOther)
    .forEach((brand) => {
      const option = document.createElement('option');
      option.value = String(brand.id);
      option.textContent = brand.name;
      selectEl.appendChild(option);
    });
}

window.initCarSelectForm = initCarSelectForm;
window.fetchCarBrandsCatalog = fetchCarBrandsCatalog;
window.populateBrandFilterSelect = populateBrandFilterSelect;
