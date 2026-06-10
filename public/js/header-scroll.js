(function () {
    var header = document.querySelector('.header');
    if (!header) {
        return;
    }

    var threshold = 60;

    function update() {
        var y = window.scrollY || document.documentElement.scrollTop;
        header.classList.toggle('header--scrolled', y > threshold);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
})();
