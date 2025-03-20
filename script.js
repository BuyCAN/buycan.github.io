/**
 * BuyCan Website Dropdown Fix - CLICK ONLY VERSION (NO HOVER)
 * This script handles the dropdown menu functionality for all screen sizes
 */
document.addEventListener('DOMContentLoaded', function() {
  // Get the dropdown button and content
  const dropdownBtn = document.querySelector('.dropdown-btn');
  const dropdownNav = document.querySelector('.dropdown-nav');
  const dropdownContent = document.querySelector('.dropdown-content');
  const dropdownArrow = document.querySelector('.dropdown-arrow');

  // Only proceed if elements exist
  if (dropdownBtn && dropdownContent) {
    // Initialize as closed
    let isOpen = false;

    // Ensure the arrow is visible
    if (dropdownArrow) {
      dropdownArrow.style.display = 'inline-flex';
    }

    // EXPLICITLY DISABLE HOVER BEHAVIOR - This is the key fix
    // Override the hover behavior by capturing and preventing the mouseenter event
    dropdownNav.addEventListener('mouseenter', function(e) {
      // Prevent the default hover behavior
      e.stopPropagation();

      // Explicitly add a style to hide the dropdown on hover
      dropdownContent.style.display = 'none';

      // Return false to prevent any default behavior
      return false;
    }, true);

    // Also capture mouseover to be extra thorough
    dropdownNav.addEventListener('mouseover', function(e) {
      // Don't allow hover to show the dropdown
      e.stopPropagation();
      return false;
    }, true);

    // Toggle dropdown ONLY on button click
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

    // Make arrow clickable too
    if (dropdownArrow) {
      dropdownArrow.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        // Trigger same behavior as button click
        isOpen = !isOpen;

        if (isOpen) {
          dropdownNav.classList.add('dropdown-open');
          dropdownContent.style.display = 'block';
        } else {
          dropdownNav.classList.remove('dropdown-open');
          dropdownContent.style.display = 'none';
        }
      });
    }

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

    console.log('Click-only dropdown script initialized successfully');
  } else {
    console.error('Dropdown elements not found');
  }
});