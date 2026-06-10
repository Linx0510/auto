/**
 * Unified toast notifications (Phase 3). Global showNotification(message, type).
 * type: 'success' | 'error' | 'info'
 */
(function () {
    var TYPE_CLASS = {
        success: 'toast--success',
        error: 'toast--error',
        info: 'toast--info'
    };
    var ICON_CLASS = {
        success: 'fa-check-circle',
        error: 'fa-circle-exclamation',
        info: 'fa-circle-info'
    };

    function getStack() {
        var el = document.querySelector('.toast-stack');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast-stack';
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        return el;
    }

    function normalizeType(t) {
        if (t === 'error') return 'error';
        if (t === 'success') return 'success';
        return 'info';
    }

    window.showNotification = function showNotification(message, type) {
        var kind = normalizeType(type);
        var stack = getStack();
        var toast = document.createElement('div');
        toast.className = 'toast ' + TYPE_CLASS[kind];
        toast.setAttribute('role', 'status');

        var body = document.createElement('div');
        body.className = 'toast-body';
        var icon = document.createElement('i');
        icon.className = 'fas ' + ICON_CLASS[kind];
        icon.setAttribute('aria-hidden', 'true');
        var msg = document.createElement('span');
        msg.className = 'toast-message';
        msg.textContent = message == null ? '' : String(message);
        body.appendChild(icon);
        body.appendChild(msg);

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', 'Закрыть');
        closeBtn.innerHTML = '&times;';

        toast.appendChild(body);
        toast.appendChild(closeBtn);

        var timeoutId;
        function close() {
            if (timeoutId) clearTimeout(timeoutId);
            toast.classList.add('toast--leaving');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }

        closeBtn.addEventListener('click', close);
        stack.appendChild(toast);
        timeoutId = setTimeout(close, 5000);
    };

    window.showToast = window.showNotification;
})();
