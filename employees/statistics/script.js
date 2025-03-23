  // Helper: Returns a "YYYY-MM-DD" string for a given Date, computed in EST
  function getESTDateString(date) {
    // Convert the given date to a string in the EST time zone
    const estString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const estDate = new Date(estString);
    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Auto-populate the date input with today's date in EST
  window.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    document.getElementById('date').value = getESTDateString(today);
  });

  // Helper to format date strings to EST with AM/PM for display
  function formatESTDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true });
  }

  // Global chart instances so we can update/destroy on each fetch
  let pieChartInstance, scanOutcomeChartInstance, productBreakdownChartInstance;

  function fetchData() {
    const authToken = 'PEEPEEPOOPOODOODOOKAKA';
    const dateValue = document.getElementById('date').value;
    const errorMessage = document.getElementById('errorMessage');

    // Clear any previous errors
    errorMessage.textContent = '';

    if (!dateValue) {
      errorMessage.textContent = 'Please select a date before fetching data.';
      return;
    }

    // Since the date input value is in "YYYY-MM-DD" format (representing EST),
    // we can split it to get the correct year, month, and day.
    const parts = dateValue.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Build the URL
    const url = `https://buycanadian.onrender.com/get-product-statistics?auth_token=${encodeURIComponent(authToken)}&year=${year}&month=${month}&day=${day}`;

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok. Status: ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        // Update Cost Analysis
        document.getElementById('average_cost').textContent = data.cost_analysis.average_cost;
        document.getElementById('max_generation_cost').textContent = data.cost_analysis.max_generation_cost;
        document.getElementById('total_cost').textContent = data.cost_analysis.total_cost;

        // Update Generation Time Analysis
        document.getElementById('average_time_to_generate').textContent = data.time_analysis.average_time_to_generate;
        document.getElementById('max_generation_time').textContent = data.time_analysis.max_generation_time;

        // Update Big Bar values: Total Views and New Products Generated
        document.getElementById('total_views').textContent = data.total_views;
        document.getElementById('new_products_generated_big').textContent = data.new_products_generated;

        // Update Date Range (converted to EST with AM/PM)
        document.getElementById('date_start').textContent = formatESTDate(data.date_range.start);
        document.getElementById('date_end').textContent = formatESTDate(data.date_range.end);

        // Create/Update Pie Chart for Scans vs Clicks
        if (pieChartInstance) {
          pieChartInstance.destroy();
        }
        pieChartInstance = new Chart(document.getElementById('pieChart'), {
          type: 'pie',
          data: {
            labels: ['Scans', 'Clicks'],
            datasets: [{
              data: [data.total_scans, data.total_clicks],
              backgroundColor: ['#D51900', '#8B0000']
            }]
          },
          options: {
            responsive: true
          }
        });

        // Create/Update Pie Chart for Scan Outcomes (Successful vs Failed Scans)
        if (scanOutcomeChartInstance) {
          scanOutcomeChartInstance.destroy();
        }
        scanOutcomeChartInstance = new Chart(document.getElementById('scanOutcomeChart'), {
          type: 'pie',
          data: {
            labels: ['Successful Scans', 'Failed Scans'],
            datasets: [{
              data: [data.total_successful_scans, data.total_failed_scans],
              backgroundColor: ['#D51900', '#8B0000']
            }]
          },
          options: {
            responsive: true
          }
        });

        // Create/Update Pie Chart for Product Breakdown
        const productsFound = data.total_successful_scans - data.new_products_generated;
        if (productBreakdownChartInstance) {
          productBreakdownChartInstance.destroy();
        }
        productBreakdownChartInstance = new Chart(document.getElementById('productBreakdownChart'), {
          type: 'pie',
          data: {
            labels: ['New Products Generated', 'Products Found in Database'],
            datasets: [{
              data: [data.new_products_generated, productsFound],
              backgroundColor: ['#D51900', '#8B0000']
            }]
          },
          options: {
            responsive: true
          }
        });
      })
      .catch(error => {
        errorMessage.textContent = 'Error fetching data: ' + error.message;
      });
  }

  // Attach event listeners to buttons
  document.getElementById('fetchDataBtn').addEventListener('click', fetchData);

  // Button to fetch yesterday's data
  document.getElementById('fetchYesterdayBtn').addEventListener('click', function() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    document.getElementById('date').value = getESTDateString(yesterday);
    fetchData();
  });

  // Button to fetch today's data
  document.getElementById('fetchTodayBtn').addEventListener('click', function() {
    const today = new Date();
    document.getElementById('date').value = getESTDateString(today);
    fetchData();
  });