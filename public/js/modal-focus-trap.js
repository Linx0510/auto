/**
 * Focus trap for modal dialogs (admin). Exposes window.bindModalFocusTrap(modalEl) -> unbind fn.
 */
(function () {
    var FOCUSABLE =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function focusableElements(container) {
        return Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE)).filter(function (el) {
            if (el.getAttribute('aria-hidden') === 'true') {
                return false;
            }
            if (el.closest('[aria-hidden="true"]')) {
                return false;
            }
            return true;
        });
    }

    window.bindModalFocusTrap = function (modalEl) {
        var previousEl = document.activeElement;
        var content = modalEl.querySelector('.modal-content') || modalEl;
        var getEls = function () {
            return focusableElements(content);
        };

        function onKeydown(e) {
            if (e.key !== 'Tab') {
                return;
            }
            var els = getEls();
            if (!els.length) {
                return;
            }
            var first = els[0];
            var last = els[els.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        modalEl.addEventListener('keydown', onKeydown);
        var els = getEls();
        if (els[0]) {
            requestAnimationFrame(function () {
                els[0].focus();
            });
        }

        return function unbind() {
            modalEl.removeEventListener('keydown', onKeydown);
            if (previousEl && typeof previousEl.focus === 'function') {
                try {
                    previousEl.focus();
                } catch (err) {
                    /* ignore */
                }
            }
        };
    };
})();
