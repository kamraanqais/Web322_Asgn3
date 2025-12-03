document.addEventListener('DOMContentLoaded', () => {
   
    document.querySelectorAll('.alert').forEach(alert => {
        new bootstrap.Alert(alert).close();
    });

   
    document.querySelectorAll('form[action*="/delete/"]').forEach(form => {
        form.addEventListener('submit', e => {
            if (!confirm('Are you sure?')) e.preventDefault();
        });
    });
});