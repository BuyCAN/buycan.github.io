/**
 * BuyCan Website Dropdown Fix
 * This script handles the dropdown menu functionality
 *
 *
 *  BuyCan Website Common JavaScript
 *  Contains shared functionality used across all pages
 *
 *  This file includes:
 *  - Back to top button functionality
 *  - Smooth scrolling for internal links
 *
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


document.addEventListener('DOMContentLoaded', function() {
    // ======================================================
    // BACK TO TOP BUTTON
    // ======================================================

    /**
     * Back to Top Button Functionality
     * Shows/hides the back-to-top button based on scroll position
     */
    const backToTopButton = document.querySelector('.back-to-top');

    if (backToTopButton) {
        // Check scroll position on page load
        if (window.scrollY > 300 || document.documentElement.scrollTop > 300) {
            backToTopButton.classList.add('visible');
        }

        // Update visibility on scroll
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300 || document.documentElement.scrollTop > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        // Scroll to top when button is clicked
        backToTopButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ======================================================
    // SMOOTH SCROLLING
    // ======================================================

    /**
     * Smooth Scrolling for Internal Links
     * Provides smooth scrolling behavior for any in-page links
     */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            // Skip handling the back-to-top button (it has its own handler above)
            if (this.classList.contains('back-to-top')) return;

            e.preventDefault();
            const targetId = this.getAttribute('href');

            // Skip empty anchors
            if (targetId === "#") return;

            // Scroll to the target element smoothly
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});