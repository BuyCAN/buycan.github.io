

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const button = this.querySelector('button');
    const originalText = button.textContent;
    button.textContent = 'Signing in...';
    button.disabled = true;

    document.getElementById('errorMessage').style.display = 'none';

    // locally hosted server API call
    fetch('https://buycanadian.onrender.com/verify-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // store auth token locally, gotten from api
            if (data.token) {
                //  token and time expiration
                const expirationTime = Date.now() + (30 * 60 * 1000); // 30 mins in milliseconds
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('tokenExpires', expirationTime);
            }
            window.location.href = 'home/index.html';
        } else {
            document.getElementById('errorMessage').style.display = 'block';
            button.textContent = originalText;
            button.disabled = false;
        }
    })
    .catch(error => {
        document.getElementById('errorMessage').style.display = 'block';
        button.textContent = originalText;
        button.disabled = false;
        console.error('Login error:', error);
    });
});