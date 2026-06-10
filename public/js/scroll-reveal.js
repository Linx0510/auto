/**
 * Scroll reveal via IntersectionObserver. Adds .is-visible to .reveal elements.
 * window.refreshScrollReveal() — observe newly added nodes.
 */
(function () {
    var observer = null;

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function revealAll() {
        document.querySelectorAll('.reveal').forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    function initObserver() {
        if (prefersReducedMotion()) {
            revealAll();
            return;
        }

        observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
        );

        document.querySelectorAll('.reveal').forEach(function (el) {
            observer.observe(el);
        });
    }

    window.refreshScrollReveal = function () {
        if (prefersReducedMotion()) {
            revealAll();
            return;
        }
        if (!observer) {
            initObserver();
            return;
        }
        document.querySelectorAll('.reveal:not(.is-visible)').forEach(function (el) {
            observer.observe(el);
        });
    };

    document.addEventListener('DOMContentLoaded', function () {
        initObserver();
    });
})();
