document.addEventListener('DOMContentLoaded', () => {
    // Auto-dismiss alerts
    document.querySelectorAll('.alert').forEach(alert => {
        new bootstrap.Alert(alert).close();
    });

    // Confirms delete
    document.querySelectorAll('form[action*="/delete/"]').forEach(form => {
        form.addEventListener('submit', e => {
            if (!confirm('Are you sure?')) e.preventDefault();
        });
    });
});