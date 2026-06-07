document.addEventListener('DOMContentLoaded', function () {
    var modal = document.querySelector('.pricing-modal');
    if (!modal) {
        return;
    }

    var openButtons = document.querySelectorAll('.js-pricing-modal');
    var closeButtons = modal.querySelectorAll('[data-pricing-close]');
    var form = modal.querySelector('[data-pricing-form]');
    var titleEl = modal.querySelector('[data-pricing-title]');
    var summaryEl = modal.querySelector('[data-pricing-summary]');
    var solutionEl = modal.querySelector('[data-pricing-solution]');
    var lastFocus = null;

    function openModal(context) {
        lastFocus = document.activeElement;
        modal.classList.add('is-open');
        document.body.classList.add('modal-open');
        if (titleEl) {
            titleEl.textContent = 'Request pricing for ' + context.label;
        }
        if (summaryEl) {
            summaryEl.textContent = context.summary;
        }
        if (solutionEl) {
            solutionEl.value = context.label;
        }
        var firstInput = modal.querySelector('input, select, button');
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
            var suite = button.getAttribute('data-suite') || 'AiVRIC';
            var tier = button.getAttribute('data-tier') || 'General';
            var request = button.getAttribute('data-request') || 'Pricing request';
            var label = suite + ' - ' + tier;
            var summary = request + ' for ' + suite + ' (' + tier + ')';
            openModal({ label: label, summary: summary });
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
            var name = (form.querySelector('[name=\"name\"]') || {}).value || '';
            var company = (form.querySelector('[name=\"company\"]') || {}).value || '';
            var email = (form.querySelector('[name=\"email\"]') || {}).value || '';
            var phone = (form.querySelector('[name=\"phone\"]') || {}).value || '';
            var environments = (form.querySelector('[name=\"environments\"]') || {}).value || '';
            var assets = (form.querySelector('[name=\"assets\"]') || {}).value || '';
            var timeline = (form.querySelector('[name=\"timeline\"]') || {}).value || '';
            var solution = solutionEl ? solutionEl.value : 'AiVRIC Pricing Request';

            var suites = Array.prototype.slice
                .call(form.querySelectorAll('input[name=\"suite\"]:checked'))
                .map(function (input) { return input.value; })
                .join(', ');

            var deployments = Array.prototype.slice
                .call(form.querySelectorAll('input[name=\"deployment\"]:checked'))
                .map(function (input) { return input.value; })
                .join(', ');

            var compliances = Array.prototype.slice
                .call(form.querySelectorAll('input[name=\"compliance\"]:checked'))
                .map(function (input) { return input.value; })
                .join(', ');

            var notes = (form.querySelector('[name=\"notes\"]') || {}).value || '';

            var subject = 'Pricing request - ' + solution;
            var bodyLines = [
                'Name: ' + name.trim(),
                'Company: ' + company.trim(),
                'Email: ' + email.trim(),
                'Phone: ' + phone.trim(),
                'Requested context: ' + solution,
                'Suites of interest: ' + (suites || 'Not specified'),
                'Deployment model: ' + (deployments || 'Not specified'),
                'Environments: ' + (environments || 'Not specified'),
                'Assets: ' + (assets || 'Not specified'),
                'Compliance needs: ' + (compliances || 'Not specified'),
                'Timeline: ' + (timeline || 'Not specified'),
                'Notes: ' + (notes.trim() || 'Not specified')
            ];

            var mailto = 'mailto:sales@aivric.com?subject=' +
                encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(bodyLines.join('\\n'));

            window.location.href = mailto;
            closeModal();
        });
    }
});
