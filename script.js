/**
 * BuyCan Website Dropdown Fix
 * This script handles the dropdown menu functionality
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get the dropdown button and content
  const dropdownBtn = document.querySelector('.dropdown-btn');
  const dropdownNav = document.querySelector('.dropdown-nav');
  const dropdownContent = document.querySelector('.dropdown-content');

  // Only proceed if elements exist
  if (dropdownBtn && dropdownContent) {
    // Initialize as closed
    let isOpen = false;

    // Toggle dropdown on button click
    dropdownBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      isOpen = !isOpen;

      if (isOpen) {
        dropdownNav.classList.add('dropdown-open');
        dropdownContent.style.display = 'block';
      } else {
        dropdownNav.classList.remove('dropdown-open');
        dropdownContent.style.display = 'none';
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (isOpen && !dropdownNav.contains(e.target)) {
        isOpen = false;
        dropdownNav.classList.remove('dropdown-open');
        dropdownContent.style.display = 'none';
      }
    });

    // Close dropdown when clicking a link
    const dropdownLinks = dropdownContent.querySelectorAll('a');
    dropdownLinks.forEach(link => {
      link.addEventListener('click', function() {
        isOpen = false;
        dropdownNav.classList.remove('dropdown-open');
        dropdownContent.style.display = 'none';
      });
    });

    // Ensure dropdown is closed initially
    dropdownContent.style.display = 'none';

    console.log('Dropdown script initialized successfully');
  } else {
    console.error('Dropdown elements not found');
  }
});