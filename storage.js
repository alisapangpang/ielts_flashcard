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
    
    // 計算新的熟悉度等級
    let newLevel = current.level;
    if (rating === 3 && newLevel < 3) {
      newLevel++;
    } else if (rating === 1 && newLevel > 1) {
      newLevel--;
    }
    // rating === 2 保持不變
    
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
  },

  // 取得統計數據
  getStatistics() {
    const progress = this.getProgress();
    const stats = {
      total: WORDS.length,
      notStarted: 0,
      level1: 0,
      level2: 0,
      level3: 0
    };

    WORDS.forEach(word => {
      const wordProgress = progress[word.id];
      if (!wordProgress || wordProgress.level === 0) {
        stats.notStarted++;
      } else {
        stats[`level${wordProgress.level}`]++;
      }
    });

    return stats;
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
  }
};