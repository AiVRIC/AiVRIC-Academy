document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('support-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var name = (form.querySelector('[name="name"]') || {}).value || '';
        var email = (form.querySelector('[name="email"]') || {}).value || '';
        var company = (form.querySelector('[name="company"]') || {}).value || '';
        var plan = (form.querySelector('[name="plan"]') || {}).value || '';
        var priority = (form.querySelector('[name="priority"]') || {}).value || '';
        var category = (form.querySelector('[name="category"]') || {}).value || '';
        var subject = (form.querySelector('[name="subject"]') || {}).value || '';
        var message = (form.querySelector('[name="message"]') || {}).value || '';

        var mailSubject = 'Support request - ' + (subject.trim() || 'General');
        var bodyLines = [
            'Name: ' + name.trim(),
            'Work Email: ' + email.trim(),
            'Organization: ' + company.trim(),
            'Plan / Service: ' + (plan || 'Not specified'),
            'Priority: ' + (priority || 'Not specified'),
            'Request Type: ' + (category || 'Not specified'),
            'Subject: ' + (subject.trim() || 'Not specified'),
            'Details: ' + (message.trim() || 'Not specified')
        ];

        var mailto = 'mailto:support@aivric.com?subject=' +
            encodeURIComponent(mailSubject) +
            '&body=' + encodeURIComponent(bodyLines.join('\n'));

        window.location.href = mailto;
    });
});
