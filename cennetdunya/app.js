let tweets = [];
let tweetsPerPage = 100; // İlk yüklemede gösterilecek tweet sayısı
let currentPage = 1;
let selectedYear = null;
let selectedMonth = null;
let years = [];
let months = [];

function loadYears() {
  fetch('tweet_data/years.json')
    .then(response => response.json())
    .then(data => {
      years = data;
      populateYearSelect();
    })
    .catch(error => console.error('Yıllar yüklenirken hata oluştu:', error));
}

function populateYearSelect() {
  const yearSelect = document.getElementById('year-select');
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

function populateMonthSelect() {
  const monthSelect = document.getElementById('month-select');
  monthSelect.innerHTML = '<option value="">Ay Seçin</option>';
  if (selectedYear) {
    fetch('tweet_data/year_months.json')
      .then(response => response.json())
      .then(data => {
        const monthsInYear = data.filter(ym => ym.year === selectedYear);
        monthsInYear.forEach(ym => {
          const option = document.createElement('option');
          option.value = ym.month;
          option.textContent = ym.month;
          monthSelect.appendChild(option);
        });
      })
      .catch(error => console.error('Aylar yüklenirken hata oluştu:', error));
  }
}

function loadTweetsForYearAndMonth(year, month) {
  let filePath = '';
  if (month) {
    filePath = `tweet_data/tweets_${year}_${month}.json`;
  } else {
    filePath = `tweet_data/tweets_${year}.json`;
  }
  fetch(filePath)
    .then(response => response.json())
    .then(data => {
      tweets = data;
      currentPage = 1;
      displayTweets();
    })
    .catch(error => console.error('Tweetler yüklenirken hata oluştu:', error));
}

function displayTweets() {
  const tweetsContainer = document.getElementById('tweets-container');
  const searchInput = document.getElementById('search-input');
  const dateInput = document.getElementById('date-input');

  let filteredTweets = tweets.filter(tweet => {
    const searchText = searchInput.value.toLowerCase();
    const selectedDate = dateInput.value;
    const textMatch = tweet.text.toLowerCase().includes(searchText);
    const dateMatch = selectedDate ? tweet.date.startsWith(selectedDate) : true;
    return textMatch && dateMatch;
  });

  // Sayfalama
  const startIndex = 0;
  const endIndex = currentPage * tweetsPerPage;
  const tweetsToDisplay = filteredTweets.slice(0, endIndex);

  tweetsContainer.innerHTML = '';
  tweetsToDisplay.forEach(tweet => {
    const tweetElement = document.createElement('div');
    tweetElement.classList.add('tweet');

    const linkElement = document.createElement('a');
    linkElement.href = tweet.link;
    linkElement.textContent = 'Tweet Linki';
    linkElement.target = '_blank';

    const dateElement = document.createElement('p');
    dateElement.classList.add('date');
    dateElement.textContent = `Tarih: ${tweet.date}`;

    const textElement = document.createElement('p');
    textElement.textContent = tweet.text;

    tweetElement.appendChild(linkElement);
    tweetElement.appendChild(dateElement);
    tweetElement.appendChild(textElement);

    tweetsContainer.appendChild(tweetElement);
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const dateInput = document.getElementById('date-input');
  const yearSelect = document.getElementById('year-select');
  const monthSelect = document.getElementById('month-select');

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    displayTweets();
  });

  dateInput.addEventListener('input', () => {
    currentPage = 1;
    displayTweets();
  });

  yearSelect.addEventListener('change', () => {
    selectedYear = yearSelect.value;
    selectedMonth = null;
    document.getElementById('month-select').value = '';
    if (selectedYear) {
      populateMonthSelect();
      loadTweetsForYearAndMonth(selectedYear, null);
    } else {
      tweets = [];
      document.getElementById('tweets-container').innerHTML = '';
    }
  });

  monthSelect.addEventListener('change', () => {
    selectedMonth = monthSelect.value;
    if (selectedYear && selectedMonth) {
      loadTweetsForYearAndMonth(selectedYear, selectedMonth);
    } else if (selectedYear) {
      loadTweetsForYearAndMonth(selectedYear, null);
    }
  });

  window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
      // Sayfanın sonuna yaklaştıkça daha fazla tweet yükle
      if ((currentPage * tweetsPerPage) < tweets.length) {
        currentPage++;
        displayTweets();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadYears();
  setupEventListeners();
});
