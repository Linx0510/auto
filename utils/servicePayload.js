/**
 * Разбор тела запроса для создания (partial: false) или частичного обновления (partial: true) услуги.
 */

function parseServicePayload(body, { partial }) {
  if (!partial) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return { ok: false, status: 400, error: 'Название обязательно' };
    }

    const description =
      typeof body.description === 'string' ? body.description : '';
    const category =
      typeof body.category === 'string' ? body.category.trim() : '';

    const priceRaw = body.price;
    const price =
      typeof priceRaw === 'string' ? Number.parseFloat(priceRaw) : Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, status: 400, error: 'Некорректная цена' };
    }

    let duration = null;
    if (
      body.duration !== undefined &&
      body.duration !== null &&
      body.duration !== ''
    ) {
      const d = Number(body.duration);
      if (!Number.isInteger(d) || d < 1) {
        return {
          ok: false,
          status: 400,
          error: 'Длительность должна быть целым числом от 1 минуты'
        };
      }
      duration = d;
    }

    let is_active = true;
    if (body.is_active !== undefined) {
      is_active = Boolean(body.is_active);
    }

    return {
      ok: true,
      value: {
        name,
        description,
        price,
        duration,
        category: category || null,
        is_active
      }
    };
  }

  const patch = {};

  if (body.name !== undefined) {
    const n = typeof body.name === 'string' ? body.name.trim() : '';
    if (!n) {
      return { ok: false, status: 400, error: 'Название не может быть пустым' };
    }
    patch.name = n;
  }

  if (body.description !== undefined) {
    patch.description =
      typeof body.description === 'string' ? body.description : '';
  }

  if (body.category !== undefined) {
    patch.category =
      typeof body.category === 'string' ? body.category.trim() : '';
  }

  if (body.price !== undefined) {
    const priceRaw = body.price;
    const price =
      typeof priceRaw === 'string' ? Number.parseFloat(priceRaw) : Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, status: 400, error: 'Некорректная цена' };
    }
    patch.price = price;
  }

  if (body.duration !== undefined) {
    if (body.duration === null || body.duration === '') {
      patch.duration = null;
    } else {
      const d = Number(body.duration);
      if (!Number.isInteger(d) || d < 1) {
        return { ok: false, status: 400, error: 'Некорректная длительность' };
      }
      patch.duration = d;
    }
  }

  if (body.is_active !== undefined) {
    patch.is_active = Boolean(body.is_active);
  }

  return { ok: true, value: patch };
}

module.exports = { parseServicePayload };
