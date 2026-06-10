(function () {
  var CATEGORY_IMAGES = {
    diagnostics: '/images/фото11.jpg',
    maintenance: '/images/фото6.jpg',
    repair: '/images/фото7.jpg',
    tires: '/images/фото12.jpg',
    electrical: '/images/фото5.jpg',
    cleaning: '/images/фото3.jpg'
  };
  var DEFAULT_IMAGE = '/images/фото11.jpg';
  var fetchSeq = 0;

  function escapeHtml(text) {
    if (typeof window.escapeHtml === 'function') {
      return window.escapeHtml(text);
    }
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function imageForCategory(category) {
    if (category && CATEGORY_IMAGES[category]) {
      return CATEGORY_IMAGES[category];
    }
    return DEFAULT_IMAGE;
  }

  function formatPrice(price) {
    var n = Number(price);
    if (!Number.isFinite(n)) {
      return '—';
    }
    return (
      n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽'
    );
  }

  function debounce(fn, ms) {
    var t = null;
    return function debounced() {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  function renderServicesSkeleton() {
    var container = document.getElementById('services-container');
    if (!container) {
      return;
    }
    var n = 6;
    var parts = ['<div class="skeleton-grid-services">'];
    for (var i = 0; i < n; i++) {
      parts.push('<div class="skeleton skeleton--animate skeleton--card"></div>');
    }
    parts.push('</div>');
    container.innerHTML = parts.join('');
  }

  function renderServices(services) {
    var container = document.getElementById('services-container');
    var select = document.getElementById('service');
    if (!container || !select) {
      return;
    }

    container.innerHTML = '';

    if (!services.length) {
      container.innerHTML =
        '<p class="text-center">Услуги временно недоступны.</p>';
      select.innerHTML = '<option value=\"\">Выберите услугу</option>';
      return;
    }

    select.innerHTML = '<option value=\"\">Выберите услугу</option>';

    services.forEach(function (service, index) {
      var card = document.createElement('div');
      card.className = 'service-card reveal';
      card.style.setProperty('--reveal-i', String(index));
      var img = imageForCategory(service.category);
      var title = escapeHtml(service.name);
      var desc = escapeHtml(service.description || '');
      var priceStr = formatPrice(service.price);
      var durHtml = '';
      if (service.duration != null && service.duration !== '') {
        durHtml =
          '<div class=\"service-duration\"><span>' +
          escapeHtml(String(service.duration)) +
          ' мин.</span></div>';
      }

      card.innerHTML =
        '<div class=\"service-header\">' +
        '<div class=\"service-photo\">' +
        '<img src=\"' +
        escapeHtml(img) +
        '\" alt=\"' +
        title +
        '\">' +
        '</div>' +
        '<h3 class=\"service-title\">' +
        title +
        '</h3>' +
        '</div>' +
        '<div class=\"service-body\">' +
        '<p class=\"service-description\">' +
        desc +
        '</p>' +
        '<div class=\"service-price\">' +
        escapeHtml(priceStr) +
        '</div>' +
        durHtml +
        '</div>';

      container.appendChild(card);

      var opt = document.createElement('option');
      opt.value = String(service.id);
      opt.textContent = service.name + ' — ' + priceStr;
      select.appendChild(opt);
    });

    if (typeof window.refreshScrollReveal === 'function') {
      window.refreshScrollReveal();
    }
  }

  function loadServices() {
    renderServicesSkeleton();
    var seq = ++fetchSeq;
    fetch('/api/services')
      .then(function (r) {
        if (!r.ok) {
          throw new Error('services');
        }
        return r.json();
      })
      .then(function (data) {
        if (seq !== fetchSeq) {
          return;
        }
        renderServices(Array.isArray(data) ? data : []);
      })
      .catch(function () {
        if (seq !== fetchSeq) {
          return;
        }
        var container = document.getElementById('services-container');
        var select = document.getElementById('service');
        if (container) {
          container.innerHTML =
            '<p class="text-center">Не удалось загрузить услуги.</p>';
        }
        if (select) {
          select.innerHTML = '<option value=\"\">Выберите услугу</option>';
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadServices();

    if (typeof io !== 'function') {
      return;
    }

    var socket = io({ query: { servicesPublic: '1' } });
    var debouncedReload = debounce(loadServices, 250);
    var skipFirstConnect = true;

    socket.on('services:updated', debouncedReload);
    socket.on('connect', function () {
      if (skipFirstConnect) {
        skipFirstConnect = false;
        return;
      }
      loadServices();
    });
  });
})();
