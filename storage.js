// localStorage 操作工具
const Storage = {
  KEY: 'flashcard_progress',

  // 讀取所有進度
  getProgress() {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : {};
  },

  // 儲存進度
  saveProgress(progress) {
    localStorage.setItem(this.KEY, JSON.stringify(progress));
  },

  // 取得單一單字的進度
  getWordProgress(wordId) {
    const progress = this.getProgress();
    return progress[wordId] || {
      level: 0,
      reviewCount: 0,
      lastReview: null
    };
  },

  // 更新單一單字的進度
  updateWordProgress(wordId, rating) {
    const progress = this.getProgress();
    const current = this.getWordProgress(wordId);
    
    // 計算新的熟悉度等級（1-4 級）
    let newLevel = current.level;
    
    if (rating === 4 && newLevel < 4) {
      newLevel++;  // 按「4」升級
    } else if (rating === 3) {
      // 按「3」保持不變
    } else if (rating === 2 && newLevel > 1) {
      newLevel--;  // 按「2」降級
    } else if (rating === 1 && newLevel > 1) {
      newLevel = Math.max(1, newLevel - 2);  // 按「1」降 2 級
    }
    
    progress[wordId] = {
      level: newLevel === 0 ? 1 : newLevel, // 第一次評分至少是 1
      reviewCount: current.reviewCount + 1,
      lastReview: new Date().toISOString()
    };
    
    this.saveProgress(progress);
    return progress[wordId];
  },

  // 重置單一單字
  resetWord(wordId) {
    const progress = this.getProgress();
    delete progress[wordId];
    this.saveProgress(progress);
  },

  // 重置所有進度
  resetAll() {
    localStorage.removeItem(this.KEY);
    localStorage.removeItem('flashcard_daily_progress');
  },

  // 取得統計數據
  getStatistics() {
    const progress = this.getProgress();
    const stats = {
      total: WORDS.length,
      notStarted: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0,
      totalReviews: 0,
      masteredCount: 0
    };

    WORDS.forEach(word => {
      const wordProgress = progress[word.id];
      if (!wordProgress || wordProgress.level === 0) {
        stats.notStarted++;
      } else {
        stats[`level${wordProgress.level}`]++;
        stats.totalReviews += wordProgress.reviewCount || 0;
        if (wordProgress.level >= 3) {
          stats.masteredCount++;
        }
      }
    });

    // 計算掌握率
    stats.masteryRate = stats.total > 0 
      ? ((stats.masteredCount / stats.total) * 100).toFixed(1) 
      : 0;
    
    // 計算平均複習次數
    const studiedWords = stats.total - stats.notStarted;
    stats.avgReviews = studiedWords > 0 
      ? (stats.totalReviews / studiedWords).toFixed(1) 
      : 0;

    return stats;
  },

  // 取得困難單字（複習次數多但等級低）
  getDifficultWords(limit = 5) {
    const progress = this.getProgress();
    const difficultWords = [];

    WORDS.forEach(word => {
      const wordProgress = progress[word.id];
      if (wordProgress && wordProgress.level <= 2 && wordProgress.reviewCount >= 3) {
        difficultWords.push({
          ...word,
          level: wordProgress.level,
          reviewCount: wordProgress.reviewCount,
          difficulty: wordProgress.reviewCount / (wordProgress.level || 1) // 難度分數
        });
      }
    });

    return difficultWords
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, limit);
  },

  // 取得容易忘記的單字（曾經高等級但降級的）
  getForgetfulWords(limit = 5) {
    const progress = this.getProgress();
    const forgetfulWords = [];

    WORDS.forEach(word => {
      const wordProgress = progress[word.id];
      // 這裡簡化判斷：複習次數多但等級不高
      if (wordProgress && wordProgress.reviewCount >= 5 && wordProgress.level <= 2) {
        forgetfulWords.push({
          ...word,
          level: wordProgress.level,
          reviewCount: wordProgress.reviewCount
        });
      }
    });

    return forgetfulWords
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, limit);
  },

  // 取得快速掌握的單字（複習次數少就到高等級）
  getQuickMasteredWords(limit = 5) {
    const progress = this.getProgress();
    const quickWords = [];

    WORDS.forEach(word => {
      const wordProgress = progress[word.id];
      if (wordProgress && wordProgress.level >= 3 && wordProgress.reviewCount <= 4) {
        quickWords.push({
          ...word,
          level: wordProgress.level,
          reviewCount: wordProgress.reviewCount,
          efficiency: wordProgress.level / wordProgress.reviewCount // 效率分數
        });
      }
    });

    return quickWords
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, limit);
  },

  // 取得學習熱力圖數據（過去 30 天）
  getHeatmapData(days = 30) {
    const dailyKey = 'flashcard_daily_progress';
    const dailyData = JSON.parse(localStorage.getItem(dailyKey) || '{}');
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dailyData[dateStr] || 0;
      
      result.push({
        date: dateStr,
        count: count,
        dayOfWeek: date.getDay(),
        weekOfMonth: Math.floor(i / 7)
      });
    }
    
    return result;
  },

  // 記錄每日學習數據
  recordDailyProgress() {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = 'flashcard_daily_progress';
    const dailyData = JSON.parse(localStorage.getItem(dailyKey) || '{}');
    
    if (!dailyData[today]) {
      dailyData[today] = 0;
    }
    dailyData[today]++;
    
    localStorage.setItem(dailyKey, JSON.stringify(dailyData));
  },

  // 取得每日進度數據（最近 7 天）
  getDailyProgress(days = 7) {
    const dailyKey = 'flashcard_daily_progress';
    const dailyData = JSON.parse(localStorage.getItem(dailyKey) || '{}');
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dailyData[dateStr] || 0;
      
      result.push({
        date: dateStr,
        count: count,
        label: this.formatDateLabel(date, i)
      });
    }
    
    return result;
  },

  formatDateLabel(date, daysAgo) {
    if (daysAgo === 0) return '今天';
    if (daysAgo === 1) return '昨天';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  // 取得原始每日進度資料（用於匯出）
  getDailyProgressRaw() {
    const dailyKey = 'flashcard_daily_progress';
    return JSON.parse(localStorage.getItem(dailyKey) || '{}');
  }
};