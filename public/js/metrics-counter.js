(function () {
    var root = document.getElementById('why-us-metrics');
    if (!root) {
        return;
    }

    var items = root.querySelectorAll('.why-us-metric');
    if (!items.length) {
        return;
    }

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function formatNum(n, format) {
        var v = Math.round(n);
        if (format === 'space') {
            return v.toLocaleString('ru-RU');
        }
        return String(v);
    }

    function setFinal(el) {
        var target = parseFloat(el.getAttribute('data-metric-target') || '0');
        var format = el.getAttribute('data-metric-format') || '';
        var numEl = el.querySelector('.why-us-metric-num');
        if (numEl) {
            numEl.textContent = formatNum(target, format);
        }
    }

    function runAnimation(el, done) {
        var target = parseFloat(el.getAttribute('data-metric-target') || '0');
        var format = el.getAttribute('data-metric-format') || '';
        var numEl = el.querySelector('.why-us-metric-num');
        if (!numEl || !Number.isFinite(target)) {
            done();
            return;
        }

        var duration = 1200;
        var start = null;

        function frame(now) {
            if (start === null) {
                start = now;
            }
            var t = Math.min(1, (now - start) / duration);
            var eased = easeOutCubic(t);
            var current = target * eased;
            numEl.textContent = formatNum(current, format);
            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                numEl.textContent = formatNum(target, format);
                done();
            }
        }

        requestAnimationFrame(frame);
    }

    if (prefersReducedMotion()) {
        items.forEach(setFinal);
        return;
    }

    var started = false;

    function startAll() {
        if (started) {
            return;
        }
        started = true;
        var pending = items.length;
        items.forEach(function (el) {
            runAnimation(el, function () {
                pending -= 1;
            });
        });
    }

    if (!('IntersectionObserver' in window)) {
        startAll();
        return;
    }

    var observer = new IntersectionObserver(
        function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    startAll();
                    obs.disconnect();
                }
            });
        },
        { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );

    observer.observe(root);
})();
