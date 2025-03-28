    // check if user is authenticated
    function checkAuthentication() {

        const token = localStorage.getItem('authToken');
        const tokenExpires = localStorage.getItem('tokenExpires');

        if (!token || !tokenExpires || Date.now() > parseInt(tokenExpires)) {
            logout();
            return false;
        }
        return true;
    }

    // logout function
    function logout() {
        const container = document.querySelector('.container');
        container.classList.add('fade-out');


        setTimeout(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('tokenExpires');
            window.location.href = '/employees';
        }, 500); // Match this with CSS transition duration
    }

    // activity timeout
    let inactivityTimeout;
    const TIMEOUT_DURATION = 30 * 60 * 1000; // 30mins in milliseconds

    // reset the inactivity timer
    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            logout();
        }, TIMEOUT_DURATION);
    }

    // check authentication on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (!checkAuthentication()) return;

        // start inactivity tracking
        resetInactivityTimer();

        // reset timer on user activity
        ['click', 'keypress', 'mousemove', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetInactivityTimer);
        });
    });

    // direct logout, gonna add pretty animations later
    document.getElementById('logoutButton').addEventListener('click', function() {
        logout();  // Direct logout without animations
    });

    // make sure the checkAuthentication function runs right away
    if (!checkAuthentication()) {
        window.location.href = '../index.html';
    }