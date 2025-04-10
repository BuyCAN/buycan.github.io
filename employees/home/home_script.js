// Highlight the active menu item in the sidebar
const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');

allSideMenu.forEach(item => {
    const li = item.parentElement;

    // Add click event to each menu item
    item.addEventListener('click', function () {
        // Remove 'active' class from all menu items
        allSideMenu.forEach(i => {
            i.parentElement.classList.remove('active');
        });
        // Add 'active' class to the clicked menu item
        li.classList.add('active');
    });
});

// TOGGLE SIDEBAR
const menuBar = document.querySelector('#content nav .bx.bx-menu');
const sidebar = document.getElementById('sidebar');

// Sidebar toggle functionality
menuBar.addEventListener('click', function () {
    // Toggle the 'hide' class to show/hide the sidebar
    sidebar.classList.toggle('hide');
});

// Adjust sidebar visibility based on screen size
function adjustSidebar() {
    if (window.innerWidth <= 576) {
        // Hide sidebar for small screens
        sidebar.classList.add('hide');
    } else {
        // Show sidebar for larger screens
        sidebar.classList.remove('hide');
    }
}

// Adjust sidebar on page load and window resize
window.addEventListener('load', adjustSidebar); // Adjust sidebar when the page loads
window.addEventListener('resize', adjustSidebar); // Adjust sidebar when the window is resized

// Remove dark mode switch functionality
const switchMode = document.getElementById('switch-mode');
if (switchMode) {
    // Remove the event listener for toggling dark mode
    switchMode.removeEventListener('change', function () {
        if (this.checked) {
            document.body.classList.add('dark'); // Enable dark mode
        } else {
            document.body.classList.remove('dark'); // Disable dark mode
        }
    });
}

// Remove notification menu toggle functionality
document.querySelector('.notification')?.removeEventListener('click', function () {
    // Toggle the visibility of the notification menu
    document.querySelector('.notification-menu').classList.toggle('show');
    // Hide the profile menu if it is open
    document.querySelector('.profile-menu').classList.remove('show');
});

// Remove profile menu toggle functionality
document.querySelector('.profile')?.removeEventListener('click', function () {
    // Toggle the visibility of the profile menu
    document.querySelector('.profile-menu').classList.toggle('show');
    // Hide the notification menu if it is open
    document.querySelector('.notification-menu').classList.remove('show');
});

// Remove functionality to close menus when clicking outside
window.removeEventListener('click', function (e) {
    if (!e.target.closest('.notification') && !e.target.closest('.profile')) {
        // Close both menus if the click is outside of them
        document.querySelector('.notification-menu')?.classList.remove('show');
        document.querySelector('.profile-menu')?.classList.remove('show');
    }
});

// Toggle the visibility of a specific menu
function toggleMenu(menuId) {
    var menu = document.getElementById(menuId);
    var allMenus = document.querySelectorAll('.menu');

    // Close all other menus
    allMenus.forEach(function (m) {
        if (m !== menu) {
            m.style.display = 'none';
        }
    });

    // Toggle the visibility of the clicked menu
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block'; // Show the menu
    } else {
        menu.style.display = 'none'; // Hide the menu
    }
}

// Keep all menus closed initially
document.addEventListener("DOMContentLoaded", function () {
    var allMenus = document.querySelectorAll('.menu');
    allMenus.forEach(function (menu) {
        menu.style.display = 'none'; // Set all menus to hidden
    });
});
