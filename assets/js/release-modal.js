document.addEventListener('DOMContentLoaded', function () {
    var modal = document.querySelector('.release-modal');
    if (!modal) {
        return;
    }

    var openButtons = document.querySelectorAll('.js-release-modal');
    var closeButtons = modal.querySelectorAll('[data-release-close]');
    var form = modal.querySelector('[data-release-form]');
    var titleEl = modal.querySelector('[data-release-title]');
    var solutionEl = modal.querySelector('[data-release-solution]');
    var lastFocus = null;

    function openModal(solutionName) {
        lastFocus = document.activeElement;
        modal.classList.add('is-open');
        document.body.classList.add('modal-open');
        if (titleEl) {
            titleEl.textContent = 'Notify me when ' + solutionName + ' is released';
        }
        if (solutionEl) {
            solutionEl.value = solutionName;
        }
        var firstInput = modal.querySelector('input, button');
        if (firstInput) {
            firstInput.focus();
        }
    }

    function closeModal() {
        modal.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        if (lastFocus && typeof lastFocus.focus === 'function') {
            lastFocus.focus();
        }
    }

    openButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            var solution = button.getAttribute('data-solution') || 'AiVRIC Solution';
            openModal(solution);
        });
    });

    closeButtons.forEach(function (button) {
        button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var name = form.querySelector('[name=\"name\"]').value.trim();
            var company = form.querySelector('[name=\"company\"]').value.trim();
            var email = form.querySelector('[name=\"email\"]').value.trim();
            var solution = solutionEl ? solutionEl.value : 'AiVRIC Solution';
            var interests = Array.prototype.slice
                .call(form.querySelectorAll('input[name=\"interest\"]:checked'))
                .map(function (input) { return input.value; })
                .join(', ');

            var subject = 'Release notification - ' + solution;
            var bodyLines = [
                'Name: ' + name,
                'Company: ' + company,
                'Email: ' + email,
                'Solution: ' + solution,
                'Key interests: ' + (interests || 'Not specified')
            ];

            var mailto = 'mailto:sales@aivric.com?subject=' +
                encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(bodyLines.join('\\n'));

            window.location.href = mailto;
            closeModal();
        });
    }
});
