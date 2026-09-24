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

  // Helper to format date strings to EST with AM/PM for display
  function formatESTDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true });
  }

  // Cap on how many days a custom range may span — keeps a fetch storm off the API
  const MAX_RANGE_DAYS = 92;

  // Global chart instances so we can update/destroy on each fetch
  let pieChartInstance, scanOutcomeChartInstance, productBreakdownChartInstance, trendChartInstance;

  function estDayList(startStr, endStr) {
    // Inclusive list of "YYYY-MM-DD" strings between two EST date strings
    const days = [];
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const cur = new Date(Date.UTC(sy, sm - 1, sd));
    const end = new Date(Date.UTC(ey, em - 1, ed));
    while (cur <= end) {
      const mm = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(cur.getUTCDate()).padStart(2, '0');
      days.push(`${cur.getUTCFullYear()}-${mm}-${dd}`);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return days;
  }

  function fetchDay(dayStr) {
    const authToken = 'PEEPEEPOOPOODOODOOKAKA';
    const [year, month, day] = dayStr.split('-').map(Number);
    const url = `${CONFIG.API_BASE_URL}/get-product-statistics?auth_token=${encodeURIComponent(authToken)}&year=${year}&month=${month}&day=${day}`;
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error('Status ' + response.status);
      }
      return response.json();
    });
  }

  // Aggregate an array of {day, data} per-day statistics responses into one range summary
  function aggregateDays(dayResponses) {
    const agg = {
      total_views: 0, total_scans: 0, total_clicks: 0,
      total_successful_scans: 0, total_failed_scans: 0,
      new_products_generated: 0, total_cost: 0,
      max_generation_cost: 0, max_time: 0,
      weighted_time_sum: 0,
      trend: { labels: [], scans: [], new_products: [], cost: [] }
    };

    dayResponses.forEach(({ day, data }) => {
      agg.total_views += data.total_views;
      agg.total_scans += data.total_scans;
      agg.total_clicks += data.total_clicks;
      agg.total_successful_scans += data.total_successful_scans;
      agg.total_failed_scans += data.total_failed_scans;
      agg.new_products_generated += data.new_products_generated;
      agg.total_cost += data.cost_analysis.total_cost;
      agg.max_generation_cost = Math.max(agg.max_generation_cost, data.cost_analysis.max_generation_cost);
      agg.max_time = Math.max(agg.max_time, data.time_analysis.max_generation_time);
      agg.weighted_time_sum += data.time_analysis.average_time_to_generate * data.new_products_generated;

      agg.trend.labels.push(day);
      agg.trend.scans.push(data.total_scans);
      agg.trend.new_products.push(data.new_products_generated);
      agg.trend.cost.push(data.cost_analysis.total_cost);
    });

    // Averages are weighted by generating scans (new products), not by days —
    // a day with 40 generations should count more than a day with 1.
    const generations = agg.new_products_generated;
    agg.average_cost = generations > 0 ? agg.total_cost / generations : 0;
    agg.average_time = generations > 0 ? agg.weighted_time_sum / generations : 0;

    return agg;
  }

  function render(agg, startStr, endStr) {
    const fmtCAD = value => '$' + Number(value).toFixed(2) + ' CAD';
    const fmtSec = value => Number(value).toFixed(1) + 's';

    // Summary cards
    document.getElementById('range_views').textContent = agg.total_views.toLocaleString();
    document.getElementById('range_scans').textContent = agg.total_scans.toLocaleString();
    document.getElementById('range_new_products').textContent = agg.new_products_generated.toLocaleString();
    document.getElementById('range_total_cost').textContent = fmtCAD(agg.total_cost);

    // Cost + time cards
    document.getElementById('average_cost').textContent = fmtCAD(agg.average_cost);
    document.getElementById('max_generation_cost').textContent = fmtCAD(agg.max_generation_cost);
    document.getElementById('total_cost').textContent = fmtCAD(agg.total_cost);
    document.getElementById('average_time_to_generate').textContent = fmtSec(agg.average_time);
    document.getElementById('max_generation_time').textContent = fmtSec(agg.max_time);

    // Pies
    const pieColors = ['#D51900', '#8B0000'];
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(document.getElementById('pieChart'), {
      type: 'pie',
      data: {
        labels: ['Scans', 'Clicks'],
        datasets: [{ data: [agg.total_scans, agg.total_clicks], backgroundColor: pieColors }]
      },
      options: { responsive: true }
    });

    if (scanOutcomeChartInstance) scanOutcomeChartInstance.destroy();
    scanOutcomeChartInstance = new Chart(document.getElementById('scanOutcomeChart'), {
      type: 'pie',
      data: {
        labels: ['Successful Scans', 'Failed Scans'],
        datasets: [{ data: [agg.total_successful_scans, agg.total_failed_scans], backgroundColor: pieColors }]
      },
      options: { responsive: true }
    });

    const productsFound = Math.max(0, agg.total_successful_scans - agg.new_products_generated);
    if (productBreakdownChartInstance) productBreakdownChartInstance.destroy();
    productBreakdownChartInstance = new Chart(document.getElementById('productBreakdownChart'), {
      type: 'pie',
      data: {
        labels: ['New Products Generated', 'Products Found in Database'],
        datasets: [{ data: [agg.new_products_generated, productsFound], backgroundColor: pieColors }]
      },
      options: { responsive: true }
    });

    // Daily trend line
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(document.getElementById('trendChart'), {
      type: 'line',
      data: {
        labels: agg.trend.labels,
        datasets: [
          {
            label: 'Scans',
            data: agg.trend.scans,
            borderColor: '#D51900',
            backgroundColor: 'rgba(213, 25, 0, 0.08)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'New Products',
            data: agg.trend.new_products,
            borderColor: '#1d5fbf',
            backgroundColor: 'rgba(29, 95, 191, 0.08)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true } }
      }
    });

    document.getElementById('rangeDisplay').textContent = `${startStr} → ${endStr} (${agg.trend.labels.length} day${agg.trend.labels.length === 1 ? '' : 's'})`;
  }

  function fetchData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    if (!startDate || !endDate) {
      errorMessage.textContent = 'Please pick both dates before fetching.';
      errorMessage.style.display = 'block';
      return;
    }
    if (endDate < startDate) {
      errorMessage.textContent = 'End date must be on or after the start date.';
      errorMessage.style.display = 'block';
      return;
    }

    const days = estDayList(startDate, endDate);
    if (days.length > MAX_RANGE_DAYS) {
      errorMessage.textContent = `Range too large — max ${MAX_RANGE_DAYS} days per fetch.`;
      errorMessage.style.display = 'block';
      return;
    }

    Promise.allSettled(days.map(day => fetchDay(day).then(data => ({ day, data }))))
      .then(results => {
        const ok = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.length - ok.length;

        if (ok.length === 0) {
          errorMessage.textContent = 'Error fetching data: every day in the range failed. Check the server.';
          errorMessage.style.display = 'block';
          return;
        }
        if (failed > 0) {
          errorMessage.textContent = `${failed} day${failed === 1 ? '' : 's'} failed to load and are excluded from these totals.`;
          errorMessage.style.display = 'block';
        }

        const agg = aggregateDays(ok);
        render(agg, ok[0].day, ok[ok.length - 1].day);
      });
  }

  // Wire up controls
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.range-controls button[data-preset]').forEach(button => {
      button.addEventListener('click', function () {
        document.querySelectorAll('.range-controls button[data-preset]').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        const preset = button.dataset.preset;
        const end = new Date();
        const start = new Date();

        if (preset === 'today') {
          document.getElementById('startDate').value = getESTDateString(end);
        } else if (preset === 'yesterday') {
          start.setDate(start.getDate() - 1);
          document.getElementById('startDate').value = getESTDateString(start);
        } else {
          start.setDate(start.getDate() - (parseInt(preset, 10) - 1));
          document.getElementById('startDate').value = getESTDateString(start);
        }
        document.getElementById('endDate').value = getESTDateString(end);
        fetchData();
      });
    });

    document.getElementById('fetchDataBtn').addEventListener('click', function () {
      document.querySelectorAll('.range-controls button[data-preset]').forEach(b => b.classList.remove('active'));
      fetchData();
    });

    // Default view: last 30 days, auto-loaded
    document.querySelector('.range-controls button[data-preset="30"]').click();
  });