const express = require('express');
const carCatalogRepository = require('../../repositories/carCatalogRepository');
const requestRepository = require('../../repositories/requestRepository');
const { validateRequestCarPayload } = require('../../services/requestCarValidation');

const router = express.Router();

router.post('/requests', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const {
      service_id,
      car_brand_id,
      car_model_id,
      custom_brand,
      custom_model,
      car_year,
      car_number,
      problem_description,
      appointment_date
    } = req.body;
    const user_id = req.session.user.id;

    if (!service_id) {
      return res.status(400).json({ error: 'Необходимо заполнить обязательные поля' });
    }

    const brandId = Number(car_brand_id);
    if (!Number.isInteger(brandId) || brandId < 1) {
      return res.status(400).json({ error: 'Укажите марку автомобиля' });
    }

    const brand = await carCatalogRepository.getBrandById(brandId);
    if (!brand) {
      return res.status(400).json({ error: 'Марка автомобиля не найдена' });
    }

    let model = null;
    if (car_model_id != null && car_model_id !== '') {
      const modelId = Number(car_model_id);
      if (!Number.isInteger(modelId) || modelId < 1) {
        return res.status(400).json({ error: 'Некорректная модель автомобиля' });
      }
      model = await carCatalogRepository.getModelById(modelId);
      if (!model) {
        return res.status(400).json({ error: 'Модель автомобиля не найдена' });
      }
    }

    const carValidation = validateRequestCarPayload({
      brand,
      model,
      customBrand: custom_brand,
      customModel: custom_model
    });

    if (carValidation.error) {
      return res.status(400).json({ error: carValidation.error });
    }

    const result = await requestRepository.insertRequest({
      user_id,
      service_id,
      car_model: carValidation.carModelDisplay,
      car_brand_id: carValidation.carBrandId,
      car_model_id: carValidation.carModelId,
      custom_brand: carValidation.customBrand,
      custom_model: carValidation.customModel,
      car_year: car_year || null,
      car_number: car_number || '',
      problem_description: problem_description || '',
      appointment_date: appointment_date || null,
      status: 'pending'
    });

    res.json({ success: true, requestId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

router.get('/my-requests', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const result = await requestRepository.listByUserId(req.session.user.id);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
