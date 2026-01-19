// 主應用程式
const App = {
  currentMode: 'learn',
  currentWordIndex: 0,
  currentWords: [],
  isFlipped: false,
  progressChart: null,
  dailyChart: null,
  exportImportBound: false,

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
    document.getElementById('rating4').addEventListener('click', () => this.rateWord(4));
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
        <div class="word-level">熟悉度: ${progress.level === 0 ? '未學習' : progress.level + ' / 4'}</div>
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
    this.renderHeatmap();
    this.renderWordRankings();
    this.filterWords('all');
    
    // 綁定匯出/匯入按鈕（只綁定一次）
    if (!this.exportImportBound) {
      this.setupExportImport();
      this.exportImportBound = true;
    }
  },
  
  setupExportImport() {
    // 匯出按鈕
    document.getElementById('exportBtn').addEventListener('click', () => this.exportProgress());

    // 匯入按鈕
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importProgress(file);
      }
    });
  },

  updateStatistics() {
    const stats = Storage.getStatistics();
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statMastery').textContent = stats.masteryRate + '%';
    document.getElementById('statAvgReviews').textContent = stats.avgReviews;
    document.getElementById('statLevel4').textContent = stats.level4;
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
        labels: ['完全掌握 (4級)', '較熟悉 (3級)', '不太熟 (2級)', '不會 (1級)', '未學習'],
        datasets: [{
          data: [stats.level4, stats.level3, stats.level2, stats.level1, stats.notStarted],
          backgroundColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#ef4444',
            '#6b7280'
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
              pointStyle: 'circle',
              color: '#ffffff'
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

  renderHeatmap() {
    const heatmapData = Storage.getHeatmapData(30);
    const container = document.getElementById('heatmap');
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1);
    
    let html = '<div class="heatmap-grid">';
    heatmapData.forEach((day) => {
      const intensity = day.count / maxCount;
      const bgColor = day.count === 0 
        ? 'rgba(75, 85, 99, 0.3)' 
        : `rgba(139, 92, 246, ${0.2 + intensity * 0.8})`;
      
      html += `<div class="heatmap-cell" style="background-color: ${bgColor};" title="${day.date}: ${day.count} 次複習"><span class="heatmap-count">${day.count || ''}</span></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  renderWordRankings() {
    const difficultWords = Storage.getDifficultWords(5);
    document.getElementById('difficultWords').innerHTML = this.renderRankingList(difficultWords);
    
    const quickWords = Storage.getQuickMasteredWords(5);
    document.getElementById('quickWords').innerHTML = this.renderRankingList(quickWords);
    
    const forgetfulWords = Storage.getForgetfulWords(5);
    document.getElementById('forgetfulWords').innerHTML = this.renderRankingList(forgetfulWords);
  },

  renderRankingList(words) {
    if (words.length === 0) {
      return '<p class="no-data">暫無數據</p>';
    }
    return words.map((word, index) => `
      <div class="ranking-item">
        <div class="ranking-number">${index + 1}</div>
        <div class="ranking-word">
          <div class="ranking-word-pair">
            <span>${word.english}</span>
            <span class="word-cn-small">${word.chinese}</span>
          </div>
          <div class="ranking-stats">
            <span class="level-badge-small">Lv.${word.level}</span>
            <span class="review-count-small">${word.reviewCount}次</span>
          </div>
        </div>
      </div>
    `).join('');
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
  },

  // 匯出進度
  exportProgress() {
    const progress = Storage.getProgress();
    const dailyProgress = Storage.getDailyProgressRaw();
    
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      wordProgress: progress,
      dailyProgress: dailyProgress,
      totalWords: WORDS.length,
      statistics: Storage.getStatistics()
    };
    
    // 建立下載連結
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcard-progress-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ 進度已匯出！檔案已下載到你的裝置。');
  },

  // 匯入進度
  importProgress(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // 驗證資料格式
        if (!data.wordProgress || !data.version) {
          alert('❌ 檔案格式錯誤！請選擇正確的進度檔案。');
          return;
        }
        
        // 詢問是否覆蓋現有進度
        const currentStats = Storage.getStatistics();
        const hasCurrentProgress = currentStats.level1 + currentStats.level2 + currentStats.level3 > 0;
        
        if (hasCurrentProgress) {
          const confirmMsg = `目前已有學習進度。\n\n` +
            `匯入檔案：${data.statistics.level1 + data.statistics.level2 + data.statistics.level3} 個已學習單字\n` +
            `目前進度：${currentStats.level1 + currentStats.level2 + currentStats.level3} 個已學習單字\n\n` +
            `選擇匯入方式：\n` +
            `- 確定：覆蓋現有進度\n` +
            `- 取消：保留現有進度`;
          
          if (!confirm(confirmMsg)) {
            return;
          }
        }
        
        // 匯入資料
        localStorage.setItem('flashcard_progress', JSON.stringify(data.wordProgress));
        if (data.dailyProgress) {
          localStorage.setItem('flashcard_daily_progress', JSON.stringify(data.dailyProgress));
        }
        
        alert('✅ 進度匯入成功！');
        this.loadReviewMode();
        
        // 清空 file input
        document.getElementById('importFile').value = '';
        
      } catch (error) {
        alert('❌ 匯入失敗：檔案格式錯誤或損壞。');
        console.error('Import error:', error);
      }
    };
    
    reader.onerror = () => {
      alert('❌ 讀取檔案失敗！');
    };
    
    reader.readAsText(file);
  }
};

// 當頁面載入完成時初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});