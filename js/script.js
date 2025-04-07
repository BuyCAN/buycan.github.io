/**
 * BuyCAN Website JavaScript
 * Contains shared functionality used across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
  // ======================================================
  // DROPDOWN MENU FUNCTIONALITY
  // ======================================================
  const dropdownBtn = document.querySelector('.dropdown-btn');
  const dropdownNav = document.querySelector('.dropdown-nav');
  const dropdownContent = document.querySelector('.dropdown-content');

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
  }

  // ======================================================
  // BACK TO TOP BUTTON
  // ======================================================
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

        // Close mobile dropdown menu after navigation if it's open
        if (dropdownNav && dropdownNav.classList.contains('dropdown-open')) {
          dropdownNav.classList.remove('dropdown-open');
          dropdownContent.style.display = 'none';
        }
      }
    });
  });

  // ======================================================
  // ENSURE PROPER LAYOUT ON WINDOW RESIZE
  // ======================================================
  window.addEventListener('resize', function() {
    // Reset dropdown menu state on resize
    if (dropdownNav && dropdownContent) {
      // Only reset if screen size changes significantly
      if (window.innerWidth > 768 && dropdownNav.classList.contains('dropdown-open')) {
        dropdownNav.classList.remove('dropdown-open');
        dropdownContent.style.display = 'none';
      }
    }
  });

  // ======================================================
  // FIX FOR IOS SAFARI VIEWPORT HEIGHT ISSUES
  // ======================================================
  // First we get the viewport height and multiply it by 1% to get a value for a vh unit
  let vh = window.innerHeight * 0.01;
  // Then we set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty('--vh', `${vh}px`);

  // We listen to the resize event
  window.addEventListener('resize', () => {
    // We execute the same script as before
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  });
});

// For the barcode page if it exists
if (document.getElementById('barcode-form')) {
  document.getElementById('barcode-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const barcode = document.getElementById('barcode').value.trim();
    // Handle barcode submission
    lookupBarcode(barcode);
  });

  // Example barcode clicks
  document.querySelectorAll('.example-barcode').forEach(example => {
    example.addEventListener('click', function() {
      const barcode = this.getAttribute('data-barcode');
      document.getElementById('barcode').value = barcode;
      lookupBarcode(barcode);
    });
  });

  function lookupBarcode(barcode) {
    // Show loading indicator and hide previous results/errors
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('result-container').style.display = 'none';

    // Simulate API call (replace with actual implementation)
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';

      // Example successful response
      if (barcode && barcode.length > 8) {
        // Display results
        document.getElementById('result-container').innerHTML = `
          <div class="result-header">
            <h3>Product Information</h3>
            <p>Barcode: ${barcode}</p>
          </div>
          <div class="result-content">
            <p>This is a sample result. In the real implementation, this would show actual product data.</p>
          </div>
        `;
        document.getElementById('result-container').style.display = 'block';
      } else {
        // Display error
        document.getElementById('error-message').textContent = 'Please enter a valid barcode number';
        document.getElementById('error-message').style.display = 'block';
      }
    }, 1500);
  }
}