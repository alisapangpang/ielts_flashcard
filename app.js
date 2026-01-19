// 主應用程式
const App = {
  currentMode: 'learn',
  currentWordIndex: 0,
  currentWords: [],
  isFlipped: false,
  progressChart: null,
  dailyChart: null,

  init() {
    this.setupEventListeners();
    this.loadLearnMode();
  },

  setupEventListeners() {
    // 模式切換
    document.getElementById('learnBtn').addEventListener('click', () => this.switchMode('learn'));
    document.getElementById('reviewBtn').addEventListener('click', () => this.switchMode('review'));

    // 卡片翻轉
    document.getElementById('flashcard').addEventListener('click', () => this.flipCard());

    // 評分按鈕
    document.getElementById('rating3').addEventListener('click', () => this.rateWord(3));
    document.getElementById('rating2').addEventListener('click', () => this.rateWord(2));
    document.getElementById('rating1').addEventListener('click', () => this.rateWord(1));

    // 篩選按鈕
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        this.filterWords(filter);
        
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // 重置按鈕
    document.getElementById('resetAll').addEventListener('click', () => {
      if (confirm('確定要重置所有學習進度嗎？')) {
        Storage.resetAll();
        this.switchMode('review');
      }
    });
  },

  switchMode(mode) {
    this.currentMode = mode;
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + 'Btn').classList.add('active');

    document.getElementById('learnSection').style.display = mode === 'learn' ? 'block' : 'none';
    document.getElementById('reviewSection').style.display = mode === 'review' ? 'block' : 'none';

    if (mode === 'learn') {
      this.loadLearnMode();
    } else {
      this.loadReviewMode();
    }
  },

  loadLearnMode() {
    this.currentWords = this.getSortedWords();
    this.currentWordIndex = 0;
    this.showCurrentWord();
  },

  getSortedWords() {
    return [...WORDS].sort((a, b) => {
      const progressA = Storage.getWordProgress(a.id);
      const progressB = Storage.getWordProgress(b.id);
      
      const levelA = progressA.level || 0;
      const levelB = progressB.level || 0;
      
      if (levelA === 0 && levelB === 0) return 0;
      if (levelA === 0) return 1;
      if (levelB === 0) return -1;
      
      return levelA - levelB;
    });
  },

  showCurrentWord() {
    if (this.currentWords.length === 0) {
      document.getElementById('flashcard').innerHTML = '<p>沒有單字可以學習</p>';
      document.getElementById('progress').textContent = '沒有單字';
      return;
    }

    const word = this.currentWords[this.currentWordIndex];
    const progress = Storage.getWordProgress(word.id);
    
    document.getElementById('progress').textContent = 
      `第 ${this.currentWordIndex + 1} / ${this.currentWords.length} 個`;
    
    this.isFlipped = false;
    const card = document.getElementById('flashcard');
    card.classList.remove('flipped');
    
    // 詞性顯示（如果有的話）
    const posDisplay = word.pos ? `<div class="word-pos">${word.pos}</div>` : '';
    
    card.innerHTML = `
      <div class="card-front">
        <div class="word-level">熟悉度: ${progress.level === 0 ? '未學習' : progress.level + ' 級'}</div>
        <div class="word-text">${word.english}</div>
        <div class="flip-hint">點擊翻轉</div>
      </div>
      <div class="card-back">
        <div class="word-text">${word.chinese}</div>
        ${posDisplay}
      </div>
    `;
  },

  flipCard() {
    this.isFlipped = !this.isFlipped;
    const card = document.getElementById('flashcard');
    if (this.isFlipped) {
      card.classList.add('flipped');
    } else {
      card.classList.remove('flipped');
    }
  },

  rateWord(rating) {
    const word = this.currentWords[this.currentWordIndex];
    Storage.updateWordProgress(word.id, rating);
    Storage.recordDailyProgress(); // 記錄每日進度
    
    this.currentWordIndex++;
    if (this.currentWordIndex >= this.currentWords.length) {
      this.currentWordIndex = 0;
      this.currentWords = this.getSortedWords();
    }
    
    this.showCurrentWord();
  },

  loadReviewMode() {
    this.updateStatistics();
    this.renderProgressChart();
    this.renderDailyChart();
    this.filterWords('all');
  },

  updateStatistics() {
    const stats = Storage.getStatistics();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statLevel3').textContent = stats.level3;
    document.getElementById('statLevel2').textContent = stats.level2;
    document.getElementById('statLevel1').textContent = stats.level1;
    document.getElementById('statNotStarted').textContent = stats.notStarted;
  },

  renderProgressChart() {
    const stats = Storage.getStatistics();
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (this.progressChart) {
      this.progressChart.destroy();
    }

    this.progressChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['熟悉 (3級)', '一般 (2級)', '不熟 (1級)', '未學習'],
        datasets: [{
          data: [stats.level3, stats.level2, stats.level1, stats.notStarted],
          backgroundColor: [
            '#10b981',
            '#3b82f6', 
            '#f59e0b',
            '#e5e7eb'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: {
                size: 14,
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} 個 (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  },

  renderDailyChart() {
    const dailyData = Storage.getDailyProgress(7);
    const ctx = document.getElementById('dailyChart').getContext('2d');
    
    if (this.dailyChart) {
      this.dailyChart.destroy();
    }

    this.dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dailyData.map(d => d.label),
        datasets: [{
          label: '每日複習次數',
          data: dailyData.map(d => d.count),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                return `複習 ${context.parsed.y} 次`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: {
                size: 12
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  },

  filterWords(filter) {
    const progress = Storage.getProgress();
    let filteredWords = [];

    if (filter === 'all') {
      filteredWords = WORDS;
    } else if (filter === 'not-started') {
      filteredWords = WORDS.filter(word => !progress[word.id] || progress[word.id].level === 0);
    } else {
      const level = parseInt(filter);
      filteredWords = WORDS.filter(word => progress[word.id] && progress[word.id].level === level);
    }

    this.renderWordList(filteredWords);
  },

  renderWordList(words) {
    const listContainer = document.getElementById('wordList');
    
    if (words.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">沒有符合條件的單字</p>';
      return;
    }

    const progress = Storage.getProgress();
    listContainer.innerHTML = words.map(word => {
      const wordProgress = progress[word.id] || { level: 0, reviewCount: 0 };
      const levelClass = wordProgress.level === 0 ? 'not-started' : `level-${wordProgress.level}`;
      const levelText = wordProgress.level === 0 ? '未學習' : `${wordProgress.level} 級`;
      const posDisplay = word.pos ? `<span class="word-pos-badge">${word.pos}</span>` : '';
      
      return `
        <div class="word-item ${levelClass}">
          <div class="word-content">
            <div class="word-pair">
              <span class="word-cn">${word.chinese}</span>
              ${posDisplay}
              <span class="word-en">${word.english}</span>
            </div>
            <div class="word-stats">
              <span class="level-badge">${levelText}</span>
              <span class="review-count">複習 ${wordProgress.reviewCount} 次</span>
            </div>
          </div>
          <button class="reset-btn" onclick="App.resetSingleWord(${word.id})">重置</button>
        </div>
      `;
    }).join('');
  },

  resetSingleWord(wordId) {
    if (confirm('確定要重置這個單字的進度嗎？')) {
      Storage.resetWord(wordId);
      this.loadReviewMode();
    }
  }
};

// 當頁面載入完成時初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});