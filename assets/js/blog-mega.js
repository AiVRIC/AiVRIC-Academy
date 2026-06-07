document.addEventListener('DOMContentLoaded', function () {
    var blogMenus = document.querySelectorAll('.blogs-menu');
    if (!blogMenus.length) {
        return;
    }

    blogMenus.forEach(function (menu) {
        var links = menu.querySelectorAll('.blog-link');
        var previews = menu.querySelectorAll('.blog-preview');

        function setActive(targetId) {
            links.forEach(function (link) {
                link.classList.toggle('is-active', link.getAttribute('data-blog') === targetId);
            });
            previews.forEach(function (preview) {
                preview.classList.toggle('is-active', preview.getAttribute('data-blog-preview') === targetId);
            });
        }

        links.forEach(function (link) {
            var target = link.getAttribute('data-blog');
            link.addEventListener('mouseenter', function () {
                setActive(target);
            });
            link.addEventListener('focus', function () {
                setActive(target);
            });
        });
    });
});
