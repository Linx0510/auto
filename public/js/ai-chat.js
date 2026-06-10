(function () {
  var GREETING =
    'Здравствуйте. Я AI-помощник автосервиса. Могу помочь подобрать услугу или оформить заявку.';

  var QUICK_ACTIONS = [
    {
      label: 'Подобрать услугу',
      message: 'Помогите подобрать подходящую услугу для моего автомобиля.'
    },
    {
      label: 'Стоимость услуг',
      message: 'Расскажите о стоимости ваших услуг.'
    },
    {
      label: 'Записаться',
      action: 'booking'
    },
    {
      label: 'Диагностика',
      message: 'Расскажите про диагностику автомобиля и когда она нужна.'
    }
  ];

  var state = {
    isOpen: false,
    greeted: false,
    isLoading: false,
    messages: []
  };

  var els = {};

  function escapeHtml(text) {
    if (typeof window.escapeHtml === 'function') {
      return window.escapeHtml(text);
    }
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function buildWidget() {
    var root = document.createElement('div');
    root.className = 'ai-chat-root';
    root.innerHTML =
      '<button type="button" class="ai-chat-toggle" id="ai-chat-toggle" aria-label="Открыть AI-помощник">' +
      '<i class="fas fa-comments" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="ai-chat-panel" id="ai-chat-panel" role="dialog" aria-label="AI-помощник автосервиса" aria-hidden="true">' +
      '<div class="ai-chat-header">' +
      '<div class="ai-chat-header-info">' +
      '<div class="ai-chat-avatar"><i class="fas fa-robot" aria-hidden="true"></i></div>' +
      '<div>' +
      '<p class="ai-chat-title">AI-помощник</p>' +
      '<p class="ai-chat-subtitle">АвтоМобилСервис</p>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="ai-chat-close" id="ai-chat-close" aria-label="Закрыть чат">' +
      '<i class="fas fa-times" aria-hidden="true"></i>' +
      '</button>' +
      '</div>' +
      '<div class="ai-chat-messages" id="ai-chat-messages"></div>' +
      '<div class="ai-chat-quick" id="ai-chat-quick"></div>' +
      '<div class="ai-chat-input-area">' +
      '<input type="text" class="ai-chat-input" id="ai-chat-input" placeholder="Напишите сообщение…" maxlength="1000" autocomplete="off">' +
      '<button type="button" class="ai-chat-send" id="ai-chat-send" aria-label="Отправить">' +
      '<i class="fas fa-paper-plane" aria-hidden="true"></i>' +
      '</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(root);

    els.root = root;
    els.toggle = root.querySelector('#ai-chat-toggle');
    els.panel = root.querySelector('#ai-chat-panel');
    els.messages = root.querySelector('#ai-chat-messages');
    els.quick = root.querySelector('#ai-chat-quick');
    els.input = root.querySelector('#ai-chat-input');
    els.send = root.querySelector('#ai-chat-send');
    els.close = root.querySelector('#ai-chat-close');

    renderQuickButtons();
    bindEvents();
  }

  function renderQuickButtons() {
    els.quick.innerHTML = '';
    QUICK_ACTIONS.forEach(function (action) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-chat-quick-btn';
      btn.textContent = action.label;
      btn.addEventListener('click', function () {
        handleQuickAction(action);
      });
      els.quick.appendChild(btn);
    });
    updateQuickButtonsState();
  }

  function updateQuickButtonsState() {
    var buttons = els.quick.querySelectorAll('.ai-chat-quick-btn');
    buttons.forEach(function (btn) {
      btn.disabled = state.isLoading;
    });
  }

  function bindEvents() {
    els.toggle.addEventListener('click', toggleChat);
    els.close.addEventListener('click', closeChat);
    els.send.addEventListener('click', handleSend);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        closeChat();
      }
    });
  }

  function toggleChat() {
    if (state.isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function openChat() {
    state.isOpen = true;
    els.panel.classList.add('ai-chat-panel--open');
    els.panel.setAttribute('aria-hidden', 'false');
    els.toggle.classList.add('ai-chat-toggle--hidden');

    if (!state.greeted) {
      state.greeted = true;
      addMessage('assistant', GREETING);
    }

    els.input.focus();
  }

  function closeChat() {
    state.isOpen = false;
    els.panel.classList.remove('ai-chat-panel--open');
    els.panel.setAttribute('aria-hidden', 'true');
    els.toggle.classList.remove('ai-chat-toggle--hidden');
  }

  function renderMessageContent(role, text) {
    if (role === 'assistant' && typeof window.parseAiChatMarkdown === 'function') {
      return (
        '<div class="ai-chat-md">' + window.parseAiChatMarkdown(text) + '</div>'
      );
    }
    return escapeHtml(text);
  }

  function addMessage(role, text) {
    state.messages.push({ role: role, text: text });

    var bubble = document.createElement('div');
    bubble.className = 'ai-chat-msg ai-chat-msg--' + role;
    bubble.innerHTML = renderMessageContent(role, text);
    els.messages.appendChild(bubble);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(function () {
      els.messages.scrollTop = els.messages.scrollHeight;
    });
  }

  function showTyping() {
    hideTyping();
    var typing = document.createElement('div');
    typing.className = 'ai-chat-typing';
    typing.id = 'ai-chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    els.messages.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    var typing = document.getElementById('ai-chat-typing');
    if (typing) {
      typing.remove();
    }
  }

  function setLoading(loading) {
    state.isLoading = loading;
    els.input.disabled = loading;
    els.send.disabled = loading;
    updateQuickButtonsState();

    if (loading) {
      showTyping();
    } else {
      hideTyping();
    }
  }

  function handleQuickAction(action) {
    if (state.isLoading) {
      return;
    }

    if (!state.isOpen) {
      openChat();
    }

    if (action.action === 'booking') {
      handleBookingAction();
      return;
    }

    if (action.message) {
      sendMessage(action.message);
    }
  }

  function handleBookingAction() {
    var contactSection = document.getElementById('contact');
    var bookingText =
      'Для записи нужны: услуга, марка и модель авто, год выпуска, описание проблемы и желаемая дата. ' +
      'Авторизуйтесь на сайте и заполните форму заявки.';

    addMessage('user', 'Записаться');
    addMessage('assistant', bookingText);

    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/profile';
    }
  }

  function handleSend() {
    var text = els.input.value.trim();
    if (!text || state.isLoading) {
      return;
    }

    if (!state.isOpen) {
      openChat();
    }

    els.input.value = '';
    sendMessage(text);
  }

  function sendMessage(text) {
    addMessage('user', text);
    setLoading(true);

    fetch('/api/ai/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: text })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        var reply =
          (result.data && result.data.reply) ||
          (result.data && result.data.error) ||
          'Извините, не удалось получить ответ. Попробуйте позже.';

        if (result.status === 429) {
          reply = result.data.error || 'Слишком много сообщений. Подождите минуту.';
        }

        addMessage('assistant', reply);
      })
      .catch(function () {
        addMessage(
          'assistant',
          'Извините, произошла ошибка соединения. Попробуйте позже или свяжитесь с нами по телефону.'
        );
      })
      .finally(function () {
        setLoading(false);
        els.input.focus();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
