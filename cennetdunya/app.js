let tweets = [];
let tweetsPerPage = 50;
let currentPage = 1;

async function loadAllTweets() {
  const files = [
    'tweet_data/tweets_2017.json',
    'tweet_data/tweets_2016.json',
    'tweet_data/tweets_unknown.json'
  ];
  const results = await Promise.all(
    files.map(f => fetch(f).then(r => r.json()).catch(() => []))
  );
  tweets = results.flat();
  tweets.sort((a, b) => new Date(b.date) - new Date(a.date));
  displayTweets();
}

function displayTweets() {
  const container = document.getElementById('tweets-container');
  const searchInput = document.getElementById('search-input');
  const searchText = searchInput.value.toLowerCase();

  const filtered = tweets.filter(t => t.text.toLowerCase().includes(searchText));
  const endIndex = currentPage * tweetsPerPage;
  const toShow = filtered.slice(0, endIndex);

  container.innerHTML = '';
  toShow.forEach(tweet => {
    const tweetEl = document.createElement('div');
    tweetEl.classList.add('tweet');

    const dateEl = document.createElement('p');
    dateEl.classList.add('date');
    dateEl.textContent = tweet.date;

    const textEl = document.createElement('p');
    textEl.textContent = tweet.text;

    const linkEl = document.createElement('a');
    linkEl.href = tweet.link;
    linkEl.target = '_blank';
    linkEl.textContent = 'Bağlantı';

    tweetEl.appendChild(dateEl);
    tweetEl.appendChild(textEl);
    tweetEl.appendChild(linkEl);

    container.appendChild(tweetEl);
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    displayTweets();
  });

  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      if (currentPage * tweetsPerPage < tweets.length) {
        currentPage++;
        displayTweets();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllTweets();
  setupEventListeners();
});
