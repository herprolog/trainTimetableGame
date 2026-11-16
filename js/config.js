/**
 * config.js - 東海道本線・伊東線・伊豆急行線 (全41駅)
 * 1時間周期のパターンダイヤをエンドレスに繰り返し生成するシステム
 */
window.TrainGame = window.TrainGame || {};
const TrainGame = window.TrainGame;

TrainGame.CONFIG = {
  // ゲーム開始時刻: 08:00:00 (28800秒)
  START_TIME: 8 * 3600,
  CYCLE_DURATION: 3600, // 1時間 (3600秒) ごとに同じダイヤがリピート

  // 現在の難易度 ('easy' | 'normal' | 'hard')
  currentDifficulty: 'normal',

  // 難易度メタデータ
  DIFFICULTIES: {
    easy: {
      id: 'easy',
      name: '初級',
      badge: '🟢 初級 (ゆったり)',
      desc: '列車本数4本/時。交換設備に余裕があり、落ち着いてスジ引きと回復運転を練習できます。'
    },
    normal: {
      id: 'normal',
      name: '中級',
      badge: '🟡 中級 (標準)',
      desc: '列車本数7本/時。特急・快速の追い越しと単線行き違いがバランスよく発生します。'
    },
    hard: {
      id: 'hard',
      name: '上級',
      badge: '🔴 上級 (リアル過密)',
      desc: '列車本数14本/時！実在の東海道・伊豆線と同等以上の超過密ダイヤ。待避と交換の嵐を捌ききるプロ向け。'
    }
  },

  // 列車種別
  TRAIN_TYPES: {
    local: {
      name: '普通',
      color: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.2)',
      speed: 75,
      stopDuration: 35
    },
    rapid: {
      name: '快速',
      color: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.2)',
      speed: 95,
      stopDuration: 40,
      passSpeed: 80
    },
    express: {
      name: '特急踊り子',
      color: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.2)',
      speed: 110,
      stopDuration: 50,
      passSpeed: 95
    }
  },

  // 全41駅定義 (東京〜熱海: 複線 / 熱海〜伊豆急下田: 単線)
  STATIONS: [
    // 複線区間 (東京〜熱海 21駅)
    { id: 'tokyo', name: '東京', shortName: '東京', distance: 0.0, isMajor: true, trackType: 'double',
      platforms: [{ id: 'TY-1', name: '9番線', direction: 'down' }, { id: 'TY-2', name: '10番線', direction: 'both' }] },
    { id: 'shimbashi', name: '新橋', shortName: '新橋', distance: 1.9, trackType: 'double',
      platforms: [{ id: 'SB-1', name: '1番線', direction: 'down' }, { id: 'SB-2', name: '2番線', direction: 'up' }] },
    { id: 'shinagawa', name: '品川', shortName: '品川', distance: 6.8, isMajor: true, trackType: 'double',
      platforms: [{ id: 'SG-1', name: '11番線(本線)', direction: 'down' }, { id: 'SG-2', name: '12番線(待避)', direction: 'down' }, { id: 'SG-3', name: '13番線', direction: 'up' }] },
    { id: 'kawasaki', name: '川崎', shortName: '川崎', distance: 18.2, trackType: 'double',
      platforms: [{ id: 'KW-1', name: '1番線', direction: 'down' }, { id: 'KW-2', name: '2番線', direction: 'up' }] },
    { id: 'yokohama', name: '横浜', shortName: '横浜', distance: 28.8, isMajor: true, trackType: 'double',
      platforms: [{ id: 'YK-1', name: '5番線(本線)', direction: 'down' }, { id: 'YK-2', name: '6番線(待避)', direction: 'down' }, { id: 'YK-3', name: '7番線', direction: 'up' }] },
    { id: 'totsuka', name: '戸塚', shortName: '戸塚', distance: 40.9, trackType: 'double',
      platforms: [{ id: 'TT-1', name: '1番線', direction: 'down' }, { id: 'TT-2', name: '2番線', direction: 'up' }] },
    { id: 'ofuna', name: '大船', shortName: '大船', distance: 46.5, isMajor: true, trackType: 'double',
      platforms: [{ id: 'OF-1', name: '1番線(本線)', direction: 'down' }, { id: 'OF-2', name: '2番線(待避)', direction: 'down' }, { id: 'OF-3', name: '3番線', direction: 'up' }] },
    { id: 'fujisawa', name: '藤沢', shortName: '藤沢', distance: 51.1, trackType: 'double',
      platforms: [{ id: 'FS-1', name: '1番線', direction: 'down' }, { id: 'FS-2', name: '2番線', direction: 'up' }] },
    { id: 'tsujido', name: '辻堂', shortName: '辻堂', distance: 54.8, trackType: 'double',
      platforms: [{ id: 'TD-1', name: '1番線', direction: 'down' }, { id: 'TD-2', name: '2番線', direction: 'up' }] },
    { id: 'chigasaki', name: '茅ヶ崎', shortName: '茅ヶ崎', distance: 58.6, trackType: 'double',
      platforms: [{ id: 'CG-1', name: '1番線', direction: 'down' }, { id: 'CG-2', name: '2番線', direction: 'up' }] },
    { id: 'hiratsuka', name: '平塚', shortName: '平塚', distance: 63.8, isMajor: true, trackType: 'double',
      platforms: [{ id: 'HT-1', name: '1番線(待避)', direction: 'down' }, { id: 'HT-2', name: '2番線(本線)', direction: 'down' }, { id: 'HT-3', name: '3番線(本線)', direction: 'up' }, { id: 'HT-4', name: '4番線(待避)', direction: 'up' }] },
    { id: 'oiso', name: '大磯', shortName: '大磯', distance: 67.8, trackType: 'double',
      platforms: [{ id: 'OI-1', name: '1番線', direction: 'down' }, { id: 'OI-2', name: '2番線', direction: 'up' }] },
    { id: 'ninomiya', name: '二宮', shortName: '二宮', distance: 73.1, trackType: 'double',
      platforms: [{ id: 'NM-1', name: '1番線', direction: 'down' }, { id: 'NM-2', name: '2番線', direction: 'up' }] },
    { id: 'kozu', name: '国府津', shortName: '国府津', distance: 77.7, isMajor: true, trackType: 'double',
      platforms: [{ id: 'KZ-1', name: '1番線(待避)', direction: 'down' }, { id: 'KZ-2', name: '2番線(本線)', direction: 'down' }, { id: 'KZ-3', name: '3番線', direction: 'up' }] },
    { id: 'kamonomiya', name: '鴨宮', shortName: '鴨宮', distance: 80.8, trackType: 'double',
      platforms: [{ id: 'KM-1', name: '1番線', direction: 'down' }, { id: 'KM-2', name: '2番線', direction: 'up' }] },
    { id: 'odawara', name: '小田原', shortName: '小田原', distance: 83.9, isMajor: true, trackType: 'double',
      platforms: [{ id: 'OD-1', name: '3番線(本線)', direction: 'down' }, { id: 'OD-2', name: '4番線(待避)', direction: 'down' }, { id: 'OD-3', name: '5番線', direction: 'up' }] },
    { id: 'hayakawa', name: '早川', shortName: '早川', distance: 86.0, trackType: 'double',
      platforms: [{ id: 'HY-1', name: '1番線', direction: 'down' }, { id: 'HY-2', name: '2番線', direction: 'up' }] },
    { id: 'nebukawa', name: '根府川', shortName: '根府川', distance: 90.4, trackType: 'double',
      platforms: [{ id: 'NB-1', name: '1番線', direction: 'down' }, { id: 'NB-2', name: '2番線(中線)', direction: 'both' }, { id: 'NB-3', name: '3番線', direction: 'up' }] },
    { id: 'manazuru', name: '真鶴', shortName: '真鶴', distance: 95.8, trackType: 'double',
      platforms: [{ id: 'MZ-1', name: '1番線', direction: 'down' }, { id: 'MZ-2', name: '2番線', direction: 'up' }] },
    { id: 'yugawara', name: '湯河原', shortName: '湯河原', distance: 99.1, trackType: 'double',
      platforms: [{ id: 'YG-1', name: '1番線', direction: 'down' }, { id: 'YG-2', name: '2番線', direction: 'up' }] },
    { id: 'atami', name: '熱海', shortName: '熱海', distance: 104.6, isMajor: true, trackType: 'double',
      platforms: [{ id: 'AT-1', name: '1番線(伊東線)', direction: 'both' }, { id: 'AT-2', name: '2番線(本線)', direction: 'down' }, { id: 'AT-3', name: '3番線', direction: 'up' }] },

    // 単線区間 (熱海〜伊豆急下田 20駅)
    { id: 'kinomiya', name: '来宮', shortName: '来宮', distance: 106.2, trackType: 'single', canPass: false,
      platforms: [{ id: 'KN-1', name: '1番線', direction: 'both' }] },
    { id: 'izu_taga', name: '伊豆多賀', shortName: '伊豆多賀', distance: 110.6, trackType: 'single', canPass: true,
      platforms: [{ id: 'TG-1', name: '1番線(交換)', direction: 'both' }, { id: 'TG-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'ajiro', name: '網代', shortName: '網代', distance: 113.3, trackType: 'single', canPass: true,
      platforms: [{ id: 'AJ-1', name: '1番線(交換)', direction: 'both' }, { id: 'AJ-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'usami', name: '宇佐美', shortName: '宇佐美', distance: 117.6, trackType: 'single', canPass: true,
      platforms: [{ id: 'US-1', name: '1番線(交換)', direction: 'both' }, { id: 'US-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'ito', name: '伊東', shortName: '伊東', distance: 121.5, isMajor: true, trackType: 'single', canPass: true,
      platforms: [{ id: 'IT-1', name: '1番線', direction: 'both' }, { id: 'IT-2', name: '2番線', direction: 'both' }] },
    { id: 'minami_ito', name: '南伊東', shortName: '南伊東', distance: 123.5, trackType: 'single', canPass: false,
      platforms: [{ id: 'MI-1', name: '1番線', direction: 'both' }] },
    { id: 'kawana', name: '川奈', shortName: '川奈', distance: 127.6, trackType: 'single', canPass: true,
      platforms: [{ id: 'KWN-1', name: '1番線(交換)', direction: 'both' }, { id: 'KWN-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'futo', name: '富戸', shortName: '富戸', distance: 133.0, trackType: 'single', canPass: true,
      platforms: [{ id: 'FT-1', name: '1番線(交換)', direction: 'both' }, { id: 'FT-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'jogasaki', name: '城ヶ崎海岸', shortName: '城ヶ崎', distance: 136.3, trackType: 'single', canPass: false,
      platforms: [{ id: 'JG-1', name: '1番線', direction: 'both' }] },
    { id: 'izu_kogen', name: '伊豆高原', shortName: '伊豆高原', distance: 137.4, isMajor: true, trackType: 'single', canPass: true,
      platforms: [{ id: 'IK-1', name: '1番線(本線)', direction: 'both' }, { id: 'IK-2', name: '2番線(待避)', direction: 'both' }, { id: 'IK-3', name: '3番線', direction: 'both' }] },
    { id: 'izu_okawa', name: '伊豆大川', shortName: '伊豆大川', distance: 142.2, trackType: 'single', canPass: true,
      platforms: [{ id: 'IO-1', name: '1番線(交換)', direction: 'both' }, { id: 'IO-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'izu_hokukawa', name: '伊豆北川', shortName: '伊豆北川', distance: 144.1, trackType: 'single', canPass: false,
      platforms: [{ id: 'IH-1', name: '1番線', direction: 'both' }] },
    { id: 'izu_atagawa', name: '伊豆熱川', shortName: '伊豆熱川', distance: 146.7, trackType: 'single', canPass: true,
      platforms: [{ id: 'IA-1', name: '1番線(交換)', direction: 'both' }, { id: 'IA-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'katase_shirata', name: '片瀬白田', shortName: '片瀬白田', distance: 148.9, trackType: 'single', canPass: true,
      platforms: [{ id: 'KS-1', name: '1番線(交換)', direction: 'both' }, { id: 'KS-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'izu_inatori', name: '伊豆稲取', shortName: '伊豆稲取', distance: 152.9, trackType: 'single', canPass: true,
      platforms: [{ id: 'IN-1', name: '1番線(交換)', direction: 'both' }, { id: 'IN-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'imaihama', name: '今井浜海岸', shortName: '今井浜', distance: 156.4, trackType: 'single', canPass: false,
      platforms: [{ id: 'IM-1', name: '1番線', direction: 'both' }] },
    { id: 'kawazu', name: '河津', shortName: '河津', distance: 158.4, trackType: 'single', canPass: true,
      platforms: [{ id: 'KZ-1', name: '1番線(交換)', direction: 'both' }, { id: 'KZ-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'inazusa', name: '稲梓', shortName: '稲梓', distance: 163.6, trackType: 'single', canPass: true,
      platforms: [{ id: 'IZ-1', name: '1番線(交換)', direction: 'both' }, { id: 'IZ-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'rendaiji', name: '蓮台寺', shortName: '蓮台寺', distance: 167.3, trackType: 'single', canPass: true,
      platforms: [{ id: 'RD-1', name: '1番線(交換)', direction: 'both' }, { id: 'RD-2', name: '2番線(交換)', direction: 'both' }] },
    { id: 'shimoda', name: '伊豆急下田', shortName: '伊豆急下田', distance: 170.2, isMajor: true, trackType: 'single', canPass: true,
      platforms: [{ id: 'SM-1', name: '1番線', direction: 'both' }, { id: 'SM-2', name: '2番線', direction: 'both' }, { id: 'SM-3', name: '3番線', direction: 'both' }] }
  ],

  // 1時間サイクル基本パターンダイヤ (cycleOffset = 0: 08:00〜09:00 の相対時刻)
  // ==========================================
  // 基本パターンダイヤ定義 (難易度別)
  // ==========================================
  DIFFICULTY_PATTERNS: {
    // ------------------------------------------
    // 1. 初級 (4本/時) - ゆったりスジ引き・単線交換の練習
    // ------------------------------------------
    easy: [
      // 下り 特急 踊り子 (毎時30分 東京発 -> 下田行)
      {
        baseId: 3020,
        nameTpl: '踊り子{N}号',
        type: 'express',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 30 * 60, trackId: 'TY-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 38 * 60, dep: 8 * 3600 + 39 * 60, trackId: 'SG-1' },
          { stationId: 'kawasaki', pass: true, arr: 8 * 3600 + 47 * 60, dep: 8 * 3600 + 47 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 8 * 3600 + 55 * 60, dep: 8 * 3600 + 56 * 60, trackId: 'YK-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 10 * 60, dep: 9 * 3600 + 11 * 60, trackId: 'OF-1' },
          { stationId: 'hiratsuka', pass: true, arr: 9 * 3600 + 23 * 60, dep: 9 * 3600 + 23 * 60, trackId: 'HT-2' },
          { stationId: 'odawara', arr: 9 * 3600 + 36 * 60, dep: 9 * 3600 + 37 * 60, trackId: 'OD-1' },
          { stationId: 'yugawara', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 49 * 60, trackId: 'YG-1' },
          { stationId: 'atami', arr: 9 * 3600 + 55 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'AT-1' },
          { stationId: 'ajiro', arr: 10 * 3600 + 7 * 60, dep: 10 * 3600 + 8 * 60, trackId: 'AJ-1' },
          { stationId: 'ito', arr: 10 * 3600 + 16 * 60, dep: 10 * 3600 + 18 * 60, trackId: 'IT-1' },
          { stationId: 'izu_kogen', arr: 10 * 3600 + 34 * 60, dep: 10 * 3600 + 36 * 60, trackId: 'IK-1' },
          { stationId: 'izu_atagawa', arr: 10 * 3600 + 47 * 60, dep: 10 * 3600 + 48 * 60, trackId: 'IA-1' },
          { stationId: 'izu_inatori', arr: 10 * 3600 + 55 * 60, dep: 10 * 3600 + 56 * 60, trackId: 'IN-1' },
          { stationId: 'kawazu', arr: 11 * 3600 + 2 * 60, dep: 11 * 3600 + 3 * 60, trackId: 'KZ-1' },
          { stationId: 'shimoda', arr: 11 * 3600 + 15 * 60, dep: 0, trackId: 'SM-1' }
        ]
      },
      // 下り 普通 (毎時05分 東京発 -> 小田原行)
      {
        baseId: 1530,
        nameTpl: '普通{ID}',
        type: 'local',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 5 * 60, trackId: 'TY-1' },
          { stationId: 'shimbashi', arr: 8 * 3600 + 8 * 60, dep: 8 * 3600 + 9 * 60, trackId: 'SB-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 16 * 60, dep: 8 * 3600 + 17 * 60, trackId: 'SG-2' },
          { stationId: 'kawasaki', arr: 8 * 3600 + 29 * 60, dep: 8 * 3600 + 30 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 8 * 3600 + 41 * 60, dep: 8 * 3600 + 43 * 60, trackId: 'YK-2' },
          { stationId: 'totsuka', arr: 8 * 3600 + 56 * 60, dep: 8 * 3600 + 57 * 60, trackId: 'TT-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 3 * 60, dep: 9 * 3600 + 5 * 60, trackId: 'OF-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 11 * 60, dep: 9 * 3600 + 12 * 60, trackId: 'FS-1' },
          { stationId: 'tsujido', arr: 9 * 3600 + 16 * 60, dep: 9 * 3600 + 17 * 60, trackId: 'TD-1' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 23 * 60, trackId: 'CG-1' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 28 * 60, dep: 9 * 3600 + 30 * 60, trackId: 'HT-1' },
          { stationId: 'oiso', arr: 9 * 3600 + 35 * 60, dep: 9 * 3600 + 36 * 60, trackId: 'OI-1' },
          { stationId: 'ninomiya', arr: 9 * 3600 + 42 * 60, dep: 9 * 3600 + 43 * 60, trackId: 'NM-1' },
          { stationId: 'kozu', arr: 9 * 3600 + 49 * 60, dep: 9 * 3600 + 51 * 60, trackId: 'KZ-1' },
          { stationId: 'odawara', arr: 10 * 3600 + 0 * 60, dep: 0, trackId: 'OD-2' }
        ]
      },
      // 上り 伊豆急普通 (毎時35分 下田発 -> 熱海行)
      {
        baseId: 5630,
        nameTpl: '伊豆普通{ID}',
        type: 'local',
        direction: 'up',
        stops: [
          { stationId: 'shimoda', arr: 0, dep: 8 * 3600 + 35 * 60, trackId: 'SM-2' },
          { stationId: 'kawazu', arr: 8 * 3600 + 50 * 60, dep: 8 * 3600 + 51 * 60, trackId: 'KZ-2' },
          { stationId: 'izu_inatori', arr: 8 * 3600 + 59 * 60, dep: 9 * 3600 + 0 * 60, trackId: 'IN-2' },
          { stationId: 'izu_atagawa', arr: 9 * 3600 + 8 * 60, dep: 9 * 3600 + 9 * 60, trackId: 'IA-2' },
          { stationId: 'izu_kogen', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 24 * 60, trackId: 'IK-3' },
          { stationId: 'futo', arr: 9 * 3600 + 30 * 60, dep: 9 * 3600 + 31 * 60, trackId: 'FT-2' },
          { stationId: 'ito', arr: 9 * 3600 + 45 * 60, dep: 9 * 3600 + 47 * 60, trackId: 'IT-1' },
          { stationId: 'ajiro', arr: 9 * 3600 + 54 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'AJ-2' },
          { stationId: 'atami', arr: 10 * 3600 + 12 * 60, dep: 0, trackId: 'AT-1' }
        ]
      },
      // 上り 普通 (毎時45分 熱海発 -> 東京行)
      {
        baseId: 1530,
        nameTpl: '普通{ID}',
        type: 'local',
        direction: 'up',
        stops: [
          { stationId: 'atami', arr: 0, dep: 8 * 3600 + 45 * 60, trackId: 'AT-3' },
          { stationId: 'yugawara', arr: 8 * 3600 + 53 * 60, dep: 8 * 3600 + 54 * 60, trackId: 'YG-2' },
          { stationId: 'manazuru', arr: 8 * 3600 + 58 * 60, dep: 8 * 3600 + 59 * 60, trackId: 'MZ-2' },
          { stationId: 'odawara', arr: 9 * 3600 + 12 * 60, dep: 9 * 3600 + 14 * 60, trackId: 'OD-3' },
          { stationId: 'kozu', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 24 * 60, trackId: 'KZ-3' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 40 * 60, dep: 9 * 3600 + 42 * 60, trackId: 'HT-3' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 47 * 60, dep: 9 * 3600 + 48 * 60, trackId: 'CG-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'FS-2' },
          { stationId: 'ofuna', arr: 10 * 3600 + 3 * 60, dep: 10 * 3600 + 5 * 60, trackId: 'OF-3' },
          { stationId: 'totsuka', arr: 10 * 3600 + 11 * 60, dep: 10 * 3600 + 12 * 60, trackId: 'TT-2' },
          { stationId: 'yokohama', arr: 10 * 3600 + 24 * 60, dep: 10 * 3600 + 26 * 60, trackId: 'YK-3' },
          { stationId: 'kawasaki', arr: 10 * 3600 + 36 * 60, dep: 10 * 3600 + 37 * 60, trackId: 'KW-2' },
          { stationId: 'shinagawa', arr: 10 * 3600 + 48 * 60, dep: 10 * 3600 + 49 * 60, trackId: 'SG-3' },
          { stationId: 'shimbashi', arr: 10 * 3600 + 56 * 60, dep: 10 * 3600 + 57 * 60, trackId: 'SB-2' },
          { stationId: 'tokyo', arr: 11 * 3600 + 0 * 60, dep: 0, trackId: 'TY-2' }
        ]
      }
    ],

    // ------------------------------------------
    // 2. 中級 (7本/時) - 標準バランスダイヤ
    // ------------------------------------------
    normal: [
    // 1. 下り 特急 踊り子 (毎時30分 東京発 -> 下田行)
    {
      baseId: 3020, // + 奇数
      nameTpl: '踊り子{N}号',
      type: 'express',
      direction: 'down',
      stops: [
        { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 30 * 60, trackId: 'TY-1' },
        { stationId: 'shinagawa', arr: 8 * 3600 + 38 * 60, dep: 8 * 3600 + 39 * 60, trackId: 'SG-1' },
        { stationId: 'kawasaki', pass: true, arr: 8 * 3600 + 47 * 60, dep: 8 * 3600 + 47 * 60, trackId: 'KW-1' },
        { stationId: 'yokohama', arr: 8 * 3600 + 55 * 60, dep: 8 * 3600 + 56 * 60, trackId: 'YK-1' },
        { stationId: 'ofuna', arr: 9 * 3600 + 10 * 60, dep: 9 * 3600 + 11 * 60, trackId: 'OF-1' },
        { stationId: 'hiratsuka', pass: true, arr: 9 * 3600 + 23 * 60, dep: 9 * 3600 + 23 * 60, trackId: 'HT-2' },
        { stationId: 'odawara', arr: 9 * 3600 + 36 * 60, dep: 9 * 3600 + 37 * 60, trackId: 'OD-1' },
        { stationId: 'yugawara', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 49 * 60, trackId: 'YG-1' },
        { stationId: 'atami', arr: 9 * 3600 + 55 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'AT-1' },
        { stationId: 'ajiro', arr: 10 * 3600 + 7 * 60, dep: 10 * 3600 + 8 * 60, trackId: 'AJ-1' },
        { stationId: 'ito', arr: 10 * 3600 + 16 * 60, dep: 10 * 3600 + 18 * 60, trackId: 'IT-1' },
        { stationId: 'izu_kogen', arr: 10 * 3600 + 34 * 60, dep: 10 * 3600 + 36 * 60, trackId: 'IK-1' },
        { stationId: 'izu_atagawa', arr: 10 * 3600 + 47 * 60, dep: 10 * 3600 + 48 * 60, trackId: 'IA-1' },
        { stationId: 'izu_inatori', arr: 10 * 3600 + 55 * 60, dep: 10 * 3600 + 56 * 60, trackId: 'IN-1' },
        { stationId: 'kawazu', arr: 11 * 3600 + 2 * 60, dep: 11 * 3600 + 3 * 60, trackId: 'KZ-1' },
        { stationId: 'shimoda', arr: 11 * 3600 + 15 * 60, dep: 0, trackId: 'SM-1' }
      ]
    },

    // 2. 下り 快速 アクティー (毎時15分 東京発 -> 熱海行)
    {
      baseId: 3520,
      nameTpl: '快速アクティー{N}号',
      type: 'rapid',
      direction: 'down',
      stops: [
        { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 15 * 60, trackId: 'TY-2' },
        { stationId: 'shimbashi', arr: 8 * 3600 + 18 * 60, dep: 8 * 3600 + 19 * 60, trackId: 'SB-1' },
        { stationId: 'shinagawa', arr: 8 * 3600 + 25 * 60, dep: 8 * 3600 + 26 * 60, trackId: 'SG-1' },
        { stationId: 'kawasaki', arr: 8 * 3600 + 36 * 60, dep: 8 * 3600 + 37 * 60, trackId: 'KW-1' },
        { stationId: 'yokohama', arr: 8 * 3600 + 46 * 60, dep: 8 * 3600 + 47 * 60, trackId: 'YK-1' },
        { stationId: 'totsuka', arr: 8 * 3600 + 58 * 60, dep: 8 * 3600 + 59 * 60, trackId: 'TT-1' },
        { stationId: 'ofuna', arr: 9 * 3600 + 5 * 60, dep: 9 * 3600 + 6 * 60, trackId: 'OF-1' },
        { stationId: 'fujisawa', arr: 9 * 3600 + 11 * 60, dep: 9 * 3600 + 12 * 60, trackId: 'FS-1' },
        { stationId: 'chigasaki', arr: 9 * 3600 + 19 * 60, dep: 9 * 3600 + 20 * 60, trackId: 'CG-1' },
        { stationId: 'hiratsuka', arr: 9 * 3600 + 25 * 60, dep: 9 * 3600 + 26 * 60, trackId: 'HT-2' },
        { stationId: 'kozu', arr: 9 * 3600 + 36 * 60, dep: 9 * 3600 + 37 * 60, trackId: 'KZ-2' },
        { stationId: 'odawara', arr: 9 * 3600 + 43 * 60, dep: 9 * 3600 + 44 * 60, trackId: 'OD-1' },
        { stationId: 'yugawara', arr: 9 * 3600 + 57 * 60, dep: 9 * 3600 + 58 * 60, trackId: 'YG-1' },
        { stationId: 'atami', arr: 10 * 3600 + 5 * 60, dep: 0, trackId: 'AT-2' }
      ]
    },

    // 3. 下り 普通列車 (毎時05分 東京発 -> 平塚で快速待避 -> 小田原行)
    {
      baseId: 1530,
      nameTpl: '普通{ID}',
      type: 'local',
      direction: 'down',
      stops: [
        { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 5 * 60, trackId: 'TY-1' },
        { stationId: 'shimbashi', arr: 8 * 3600 + 8 * 60, dep: 8 * 3600 + 9 * 60, trackId: 'SB-1' },
        { stationId: 'shinagawa', arr: 8 * 3600 + 16 * 60, dep: 8 * 3600 + 17 * 60, trackId: 'SG-2' },
        { stationId: 'kawasaki', arr: 8 * 3600 + 29 * 60, dep: 8 * 3600 + 30 * 60, trackId: 'KW-1' },
        { stationId: 'yokohama', arr: 8 * 3600 + 41 * 60, dep: 8 * 3600 + 43 * 60, trackId: 'YK-2' },
        { stationId: 'totsuka', arr: 8 * 3600 + 56 * 60, dep: 8 * 3600 + 57 * 60, trackId: 'TT-1' },
        { stationId: 'ofuna', arr: 9 * 3600 + 3 * 60, dep: 9 * 3600 + 5 * 60, trackId: 'OF-2' },
        { stationId: 'fujisawa', arr: 9 * 3600 + 11 * 60, dep: 9 * 3600 + 12 * 60, trackId: 'FS-1' },
        { stationId: 'tsujido', arr: 9 * 3600 + 16 * 60, dep: 9 * 3600 + 17 * 60, trackId: 'TD-1' },
        { stationId: 'chigasaki', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 23 * 60, trackId: 'CG-1' },
        { stationId: 'hiratsuka', arr: 9 * 3600 + 28 * 60, dep: 9 * 3600 + 34 * 60, trackId: 'HT-1' },
        { stationId: 'oiso', arr: 9 * 3600 + 39 * 60, dep: 9 * 3600 + 40 * 60, trackId: 'OI-1' },
        { stationId: 'ninomiya', arr: 9 * 3600 + 46 * 60, dep: 9 * 3600 + 47 * 60, trackId: 'NM-1' },
        { stationId: 'kozu', arr: 9 * 3600 + 53 * 60, dep: 9 * 3600 + 55 * 60, trackId: 'KZ-1' },
        { stationId: 'odawara', arr: 10 * 3600 + 4 * 60, dep: 0, trackId: 'OD-2' }
      ]
    },

    // 4. 下り 伊豆急普通 (毎時30分 熱海発 -> 下田行 / 単線交換)
    {
      baseId: 5630,
      nameTpl: '伊豆普通{ID}',
      type: 'local',
      direction: 'down',
      stops: [
        { stationId: 'atami', arr: 0, dep: 8 * 3600 + 30 * 60, trackId: 'AT-1' },
        { stationId: 'kinomiya', arr: 8 * 3600 + 33 * 60, dep: 8 * 3600 + 34 * 60, trackId: 'KN-1' },
        { stationId: 'izu_taga', arr: 8 * 3600 + 40 * 60, dep: 8 * 3600 + 41 * 60, trackId: 'TG-1' },
        { stationId: 'ajiro', arr: 8 * 3600 + 46 * 60, dep: 8 * 3600 + 50 * 60, trackId: 'AJ-1' },
        { stationId: 'usami', arr: 8 * 3600 + 56 * 60, dep: 8 * 3600 + 57 * 60, trackId: 'US-1' },
        { stationId: 'ito', arr: 9 * 3600 + 3 * 60, dep: 9 * 3600 + 23 * 60, trackId: 'IT-2' },
        { stationId: 'kawana', arr: 9 * 3600 + 35 * 60, dep: 9 * 3600 + 36 * 60, trackId: 'KWN-1' },
        { stationId: 'futo', arr: 9 * 3600 + 44 * 60, dep: 9 * 3600 + 45 * 60, trackId: 'FT-1' },
        { stationId: 'izu_kogen', arr: 9 * 3600 + 51 * 60, dep: 9 * 3600 + 53 * 60, trackId: 'IK-2' },
        { stationId: 'izu_atagawa', arr: 10 * 3600 + 5 * 60, dep: 10 * 3600 + 6 * 60, trackId: 'IA-1' },
        { stationId: 'izu_inatori', arr: 10 * 3600 + 14 * 60, dep: 10 * 3600 + 15 * 60, trackId: 'IN-1' },
        { stationId: 'kawazu', arr: 10 * 3600 + 23 * 60, dep: 10 * 3600 + 24 * 60, trackId: 'KZ-1' },
        { stationId: 'shimoda', arr: 10 * 3600 + 40 * 60, dep: 0, trackId: 'SM-2' }
      ]
    },

    // 5. 上り 特急 踊り子 (毎時20分 下田発 -> 東京行)
    {
      baseId: 3020,
      nameTpl: '踊り子{N}号',
      type: 'express',
      direction: 'up',
      stops: [
        { stationId: 'shimoda', arr: 0, dep: 8 * 3600 + 20 * 60, trackId: 'SM-1' },
        { stationId: 'kawazu', arr: 8 * 3600 + 32 * 60, dep: 8 * 3600 + 33 * 60, trackId: 'KZ-2' },
        { stationId: 'izu_inatori', arr: 8 * 3600 + 40 * 60, dep: 8 * 3600 + 41 * 60, trackId: 'IN-2' },
        { stationId: 'izu_atagawa', arr: 8 * 3600 + 48 * 60, dep: 8 * 3600 + 49 * 60, trackId: 'IA-2' },
        { stationId: 'izu_kogen', arr: 9 * 3600 + 1 * 60, dep: 9 * 3600 + 3 * 60, trackId: 'IK-3' },
        { stationId: 'ito', arr: 9 * 3600 + 19 * 60, dep: 9 * 3600 + 21 * 60, trackId: 'IT-1' },
        { stationId: 'usami', arr: 9 * 3600 + 27 * 60, dep: 9 * 3600 + 30 * 60, trackId: 'US-2' },
        { stationId: 'atami', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 50 * 60, trackId: 'AT-3' },
        { stationId: 'yugawara', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'YG-2' },
        { stationId: 'odawara', arr: 10 * 3600 + 8 * 60, dep: 10 * 3600 + 9 * 60, trackId: 'OD-3' },
        { stationId: 'ofuna', arr: 10 * 3600 + 33 * 60, dep: 10 * 3600 + 34 * 60, trackId: 'OF-3' },
        { stationId: 'yokohama', arr: 10 * 3600 + 47 * 60, dep: 10 * 3600 + 48 * 60, trackId: 'YK-3' },
        { stationId: 'shinagawa', arr: 11 * 3600 + 4 * 60, dep: 11 * 3600 + 5 * 60, trackId: 'SG-3' },
        { stationId: 'tokyo', arr: 11 * 3600 + 13 * 60, dep: 0, trackId: 'TY-2' }
      ]
    },

    // 6. 上り 伊豆急普通 (毎時35分 下田発 -> 熱海行 / 単線交換)
    {
      baseId: 5630,
      nameTpl: '伊豆普通{ID}',
      type: 'local',
      direction: 'up',
      stops: [
        { stationId: 'shimoda', arr: 0, dep: 8 * 3600 + 35 * 60, trackId: 'SM-2' },
        { stationId: 'kawazu', arr: 8 * 3600 + 50 * 60, dep: 8 * 3600 + 51 * 60, trackId: 'KZ-2' },
        { stationId: 'izu_inatori', arr: 8 * 3600 + 59 * 60, dep: 9 * 3600 + 0 * 60, trackId: 'IN-2' },
        { stationId: 'izu_atagawa', arr: 9 * 3600 + 8 * 60, dep: 9 * 3600 + 9 * 60, trackId: 'IA-2' },
        { stationId: 'izu_kogen', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 24 * 60, trackId: 'IK-3' },
        { stationId: 'futo', arr: 9 * 3600 + 30 * 60, dep: 9 * 3600 + 31 * 60, trackId: 'FT-2' },
        { stationId: 'ito', arr: 9 * 3600 + 45 * 60, dep: 9 * 3600 + 47 * 60, trackId: 'IT-1' },
        { stationId: 'ajiro', arr: 9 * 3600 + 54 * 60, dep: 10 * 3600 + 10 * 60, trackId: 'AJ-2' },
        { stationId: 'atami', arr: 10 * 3600 + 25 * 60, dep: 0, trackId: 'AT-1' }
      ]
    },

    // 7. 上り 普通列車 (毎時45分 熱海発 -> 東京行)
    {
      baseId: 1530,
      nameTpl: '普通{ID}',
      type: 'local',
      direction: 'up',
      stops: [
        { stationId: 'atami', arr: 0, dep: 8 * 3600 + 45 * 60, trackId: 'AT-3' },
        { stationId: 'yugawara', arr: 8 * 3600 + 53 * 60, dep: 8 * 3600 + 54 * 60, trackId: 'YG-2' },
        { stationId: 'manazuru', arr: 8 * 3600 + 58 * 60, dep: 8 * 3600 + 59 * 60, trackId: 'MZ-2' },
        { stationId: 'odawara', arr: 9 * 3600 + 12 * 60, dep: 9 * 3600 + 14 * 60, trackId: 'OD-3' },
        { stationId: 'kozu', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 24 * 60, trackId: 'KZ-3' },
        { stationId: 'hiratsuka', arr: 9 * 3600 + 40 * 60, dep: 9 * 3600 + 42 * 60, trackId: 'HT-3' },
        { stationId: 'chigasaki', arr: 9 * 3600 + 47 * 60, dep: 9 * 3600 + 48 * 60, trackId: 'CG-2' },
        { stationId: 'fujisawa', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'FS-2' },
        { stationId: 'ofuna', arr: 10 * 3600 + 3 * 60, dep: 10 * 3600 + 5 * 60, trackId: 'OF-3' },
        { stationId: 'totsuka', arr: 10 * 3600 + 11 * 60, dep: 10 * 3600 + 12 * 60, trackId: 'TT-2' },
        { stationId: 'yokohama', arr: 10 * 3600 + 24 * 60, dep: 10 * 3600 + 26 * 60, trackId: 'YK-3' },
        { stationId: 'kawasaki', arr: 10 * 3600 + 36 * 60, dep: 10 * 3600 + 37 * 60, trackId: 'KW-2' },
        { stationId: 'shinagawa', arr: 10 * 3600 + 48 * 60, dep: 10 * 3600 + 49 * 60, trackId: 'SG-3' },
        { stationId: 'shimbashi', arr: 10 * 3600 + 56 * 60, dep: 10 * 3600 + 57 * 60, trackId: 'SB-2' },
        { stationId: 'tokyo', arr: 11 * 3600 + 0 * 60, dep: 0, trackId: 'TY-2' }
      ]
    }
  ],

    // ------------------------------------------
    // 3. 上級 (14本/時) - 実ダイヤ級超過密ダイヤ！
    // ------------------------------------------
    hard: [
      // 1. 下り 特急 サフィール踊り子1号 (毎時00分 東京発 -> 下田行)
      {
        baseId: 3000,
        nameTpl: 'サフィール{N}号',
        type: 'express',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 0 * 60, trackId: 'TY-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 7 * 60, dep: 8 * 3600 + 8 * 60, trackId: 'SG-1' },
          { stationId: 'yokohama', arr: 8 * 3600 + 23 * 60, dep: 8 * 3600 + 24 * 60, trackId: 'YK-1' },
          { stationId: 'ofuna', pass: true, arr: 8 * 3600 + 37 * 60, dep: 8 * 3600 + 37 * 60, trackId: 'OF-1' },
          { stationId: 'odawara', pass: true, arr: 9 * 3600 + 4 * 60, dep: 9 * 3600 + 4 * 60, trackId: 'OD-1' },
          { stationId: 'atami', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 24 * 60, trackId: 'AT-1' },
          { stationId: 'ito', arr: 9 * 3600 + 42 * 60, dep: 9 * 3600 + 44 * 60, trackId: 'IT-1' },
          { stationId: 'izu_kogen', arr: 10 * 3600 + 0 * 60, dep: 10 * 3600 + 2 * 60, trackId: 'IK-1' },
          { stationId: 'izu_atagawa', arr: 10 * 3600 + 13 * 60, dep: 10 * 3600 + 14 * 60, trackId: 'IA-1' },
          { stationId: 'izu_inatori', arr: 10 * 3600 + 21 * 60, dep: 10 * 3600 + 22 * 60, trackId: 'IN-1' },
          { stationId: 'kawazu', arr: 10 * 3600 + 28 * 60, dep: 10 * 3600 + 29 * 60, trackId: 'KZ-1' },
          { stationId: 'shimoda', arr: 10 * 3600 + 42 * 60, dep: 0, trackId: 'SM-1' }
        ]
      },
      // 2. 下り 普通1521M (毎時05分 東京発 -> 平塚待避 -> 熱海行)
      {
        baseId: 1520,
        nameTpl: '普通{ID}',
        type: 'local',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 5 * 60, trackId: 'TY-2' },
          { stationId: 'shimbashi', arr: 8 * 3600 + 8 * 60, dep: 8 * 3600 + 9 * 60, trackId: 'SB-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 16 * 60, dep: 8 * 3600 + 17 * 60, trackId: 'SG-2' },
          { stationId: 'kawasaki', arr: 8 * 3600 + 28 * 60, dep: 8 * 3600 + 29 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 8 * 3600 + 40 * 60, dep: 8 * 3600 + 41 * 60, trackId: 'YK-2' },
          { stationId: 'totsuka', arr: 8 * 3600 + 54 * 60, dep: 8 * 3600 + 55 * 60, trackId: 'TT-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 1 * 60, dep: 9 * 3600 + 2 * 60, trackId: 'OF-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 8 * 60, dep: 9 * 3600 + 9 * 60, trackId: 'FS-1' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 18 * 60, dep: 9 * 3600 + 19 * 60, trackId: 'CG-1' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 25 * 60, dep: 9 * 3600 + 32 * 60, trackId: 'HT-1' }, // 快速待避
          { stationId: 'kozu', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 49 * 60, trackId: 'KZ-1' },
          { stationId: 'odawara', arr: 9 * 3600 + 57 * 60, dep: 9 * 3600 + 59 * 60, trackId: 'OD-2' },
          { stationId: 'yugawara', arr: 10 * 3600 + 12 * 60, dep: 10 * 3600 + 13 * 60, trackId: 'YG-1' },
          { stationId: 'atami', arr: 10 * 3600 + 22 * 60, dep: 0, trackId: 'AT-2' }
        ]
      },
      // 3. 下り 快速アクティー1号 (毎時15分 東京発 -> 熱海行)
      {
        baseId: 3520,
        nameTpl: '快速アクティー{N}号',
        type: 'rapid',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 15 * 60, trackId: 'TY-1' },
          { stationId: 'shimbashi', arr: 8 * 3600 + 18 * 60, dep: 8 * 3600 + 19 * 60, trackId: 'SB-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 25 * 60, dep: 8 * 3600 + 26 * 60, trackId: 'SG-1' },
          { stationId: 'kawasaki', arr: 8 * 3600 + 36 * 60, dep: 8 * 3600 + 37 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 8 * 3600 + 46 * 60, dep: 8 * 3600 + 47 * 60, trackId: 'YK-1' },
          { stationId: 'totsuka', arr: 8 * 3600 + 58 * 60, dep: 8 * 3600 + 59 * 60, trackId: 'TT-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 5 * 60, dep: 9 * 3600 + 6 * 60, trackId: 'OF-1' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 11 * 60, dep: 9 * 3600 + 12 * 60, trackId: 'FS-1' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 19 * 60, dep: 9 * 3600 + 20 * 60, trackId: 'CG-1' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 26 * 60, dep: 9 * 3600 + 27 * 60, trackId: 'HT-2' }, // 普通追抜
          { stationId: 'kozu', arr: 9 * 3600 + 38 * 60, dep: 9 * 3600 + 39 * 60, trackId: 'KZ-2' },
          { stationId: 'odawara', arr: 9 * 3600 + 45 * 60, dep: 9 * 3600 + 46 * 60, trackId: 'OD-1' },
          { stationId: 'yugawara', arr: 9 * 3600 + 58 * 60, dep: 9 * 3600 + 59 * 60, trackId: 'YG-1' },
          { stationId: 'atami', arr: 10 * 3600 + 7 * 60, dep: 0, trackId: 'AT-1' }
        ]
      },
      // 4. 下り 伊豆急普通5621M (毎時10分 熱海発 -> 下田行 / 網代・富戸で交換)
      {
        baseId: 5610,
        nameTpl: '伊豆普通{ID}',
        type: 'local',
        direction: 'down',
        stops: [
          { stationId: 'atami', arr: 0, dep: 8 * 3600 + 10 * 60, trackId: 'AT-1' },
          { stationId: 'kinomiya', arr: 8 * 3600 + 13 * 60, dep: 8 * 3600 + 14 * 60, trackId: 'KN-1' },
          { stationId: 'ajiro', arr: 8 * 3600 + 25 * 60, dep: 8 * 3600 + 29 * 60, trackId: 'AJ-1' }, // 交換
          { stationId: 'ito', arr: 8 * 3600 + 43 * 60, dep: 8 * 3600 + 45 * 60, trackId: 'IT-2' },
          { stationId: 'futo', arr: 9 * 3600 + 3 * 60, dep: 9 * 3600 + 7 * 60, trackId: 'FT-1' }, // 交換
          { stationId: 'izu_kogen', arr: 9 * 3600 + 14 * 60, dep: 9 * 3600 + 18 * 60, trackId: 'IK-2' },
          { stationId: 'izu_atagawa', arr: 9 * 3600 + 30 * 60, dep: 9 * 3600 + 32 * 60, trackId: 'IA-1' },
          { stationId: 'kawazu', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 50 * 60, trackId: 'KZ-1' },
          { stationId: 'shimoda', arr: 10 * 3600 + 4 * 60, dep: 0, trackId: 'SM-2' }
        ]
      },
      // 5. 下り 特急 踊り子3号 (毎時30分 東京発 -> 下田行)
      {
        baseId: 3020,
        nameTpl: '踊り子{N}号',
        type: 'express',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 30 * 60, trackId: 'TY-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 38 * 60, dep: 8 * 3600 + 39 * 60, trackId: 'SG-1' },
          { stationId: 'kawasaki', pass: true, arr: 8 * 3600 + 47 * 60, dep: 8 * 3600 + 47 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 8 * 3600 + 55 * 60, dep: 8 * 3600 + 56 * 60, trackId: 'YK-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 10 * 60, dep: 9 * 3600 + 11 * 60, trackId: 'OF-1' },
          { stationId: 'hiratsuka', pass: true, arr: 9 * 3600 + 23 * 60, dep: 9 * 3600 + 23 * 60, trackId: 'HT-2' },
          { stationId: 'odawara', arr: 9 * 3600 + 36 * 60, dep: 9 * 3600 + 37 * 60, trackId: 'OD-1' },
          { stationId: 'yugawara', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 49 * 60, trackId: 'YG-1' },
          { stationId: 'atami', arr: 9 * 3600 + 55 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'AT-1' },
          { stationId: 'ajiro', arr: 10 * 3600 + 7 * 60, dep: 10 * 3600 + 8 * 60, trackId: 'AJ-1' },
          { stationId: 'ito', arr: 10 * 3600 + 16 * 60, dep: 10 * 3600 + 18 * 60, trackId: 'IT-1' },
          { stationId: 'izu_kogen', arr: 10 * 3600 + 34 * 60, dep: 10 * 3600 + 36 * 60, trackId: 'IK-1' },
          { stationId: 'izu_atagawa', arr: 10 * 3600 + 47 * 60, dep: 10 * 3600 + 48 * 60, trackId: 'IA-1' },
          { stationId: 'izu_inatori', arr: 10 * 3600 + 55 * 60, dep: 10 * 3600 + 56 * 60, trackId: 'IN-1' },
          { stationId: 'kawazu', arr: 11 * 3600 + 2 * 60, dep: 11 * 3600 + 3 * 60, trackId: 'KZ-1' },
          { stationId: 'shimoda', arr: 11 * 3600 + 15 * 60, dep: 0, trackId: 'SM-1' }
        ]
      },
      // 6. 下り 普通1523M (毎時35分 東京発 -> 国府津行)
      {
        baseId: 1540,
        nameTpl: '普通{ID}',
        type: 'local',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 35 * 60, trackId: 'TY-2' },
          { stationId: 'shimbashi', arr: 8 * 3600 + 38 * 60, dep: 8 * 3600 + 39 * 60, trackId: 'SB-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 47 * 60, dep: 8 * 3600 + 48 * 60, trackId: 'SG-2' },
          { stationId: 'kawasaki', arr: 8 * 3600 + 59 * 60, dep: 9 * 3600 + 0 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 9 * 3600 + 11 * 60, dep: 9 * 3600 + 12 * 60, trackId: 'YK-2' },
          { stationId: 'totsuka', arr: 9 * 3600 + 26 * 60, dep: 9 * 3600 + 27 * 60, trackId: 'TT-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 33 * 60, dep: 9 * 3600 + 34 * 60, trackId: 'OF-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 40 * 60, dep: 9 * 3600 + 41 * 60, trackId: 'FS-1' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 50 * 60, dep: 9 * 3600 + 51 * 60, trackId: 'CG-1' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 57 * 60, dep: 10 * 3600 + 4 * 60, trackId: 'HT-1' }, // 快速待避
          { stationId: 'kozu', arr: 10 * 3600 + 20 * 60, dep: 0, trackId: 'KZ-1' }
        ]
      },
      // 7. 下り 快速アクティー3号 (毎時45分 東京発 -> 小田原行)
      {
        baseId: 3540,
        nameTpl: '快速アクティー{N}号',
        type: 'rapid',
        direction: 'down',
        stops: [
          { stationId: 'tokyo', arr: 0, dep: 8 * 3600 + 45 * 60, trackId: 'TY-1' },
          { stationId: 'shimbashi', arr: 8 * 3600 + 48 * 60, dep: 8 * 3600 + 49 * 60, trackId: 'SB-1' },
          { stationId: 'shinagawa', arr: 8 * 3600 + 55 * 60, dep: 8 * 3600 + 56 * 60, trackId: 'SG-1' },
          { stationId: 'kawasaki', arr: 9 * 3600 + 6 * 60, dep: 9 * 3600 + 7 * 60, trackId: 'KW-1' },
          { stationId: 'yokohama', arr: 9 * 3600 + 16 * 60, dep: 9 * 3600 + 17 * 60, trackId: 'YK-1' },
          { stationId: 'totsuka', arr: 9 * 3600 + 28 * 60, dep: 9 * 3600 + 29 * 60, trackId: 'TT-1' },
          { stationId: 'ofuna', arr: 9 * 3600 + 35 * 60, dep: 9 * 3600 + 36 * 60, trackId: 'OF-1' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 41 * 60, dep: 9 * 3600 + 42 * 60, trackId: 'FS-1' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 49 * 60, dep: 9 * 3600 + 50 * 60, trackId: 'CG-1' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'HT-2' }, // 追抜
          { stationId: 'kozu', arr: 10 * 3600 + 8 * 60, dep: 10 * 3600 + 9 * 60, trackId: 'KZ-2' },
          { stationId: 'odawara', arr: 10 * 3600 + 15 * 60, dep: 0, trackId: 'OD-1' }
        ]
      },
      // 8. 下り 伊豆急普通5623M (毎時40分 熱海発 -> 下田行)
      {
        baseId: 5650,
        nameTpl: '伊豆普通{ID}',
        type: 'local',
        direction: 'down',
        stops: [
          { stationId: 'atami', arr: 0, dep: 8 * 3600 + 40 * 60, trackId: 'AT-1' },
          { stationId: 'kinomiya', arr: 8 * 3600 + 43 * 60, dep: 8 * 3600 + 44 * 60, trackId: 'KN-1' },
          { stationId: 'usami', arr: 8 * 3600 + 57 * 60, dep: 9 * 3600 + 0 * 60, trackId: 'US-1' }, // 交換
          { stationId: 'ito', arr: 9 * 3600 + 6 * 60, dep: 9 * 3600 + 8 * 60, trackId: 'IT-2' },
          { stationId: 'kawana', arr: 9 * 3600 + 17 * 60, dep: 9 * 3600 + 19 * 60, trackId: 'KWN-1' },
          { stationId: 'izu_kogen', arr: 9 * 3600 + 35 * 60, dep: 9 * 3600 + 41 * 60, trackId: 'IK-2' },
          { stationId: 'izu_atagawa', arr: 9 * 3600 + 53 * 60, dep: 9 * 3600 + 55 * 60, trackId: 'IA-1' },
          { stationId: 'kawazu', arr: 10 * 3600 + 11 * 60, dep: 10 * 3600 + 13 * 60, trackId: 'KZ-1' },
          { stationId: 'shimoda', arr: 10 * 3600 + 28 * 60, dep: 0, trackId: 'SM-2' }
        ]
      },
      // 9. 上り 特急 踊り子2号 (毎時20分 下田発 -> 東京行)
      {
        baseId: 3020,
        nameTpl: '踊り子{N}号',
        type: 'express',
        direction: 'up',
        stops: [
          { stationId: 'shimoda', arr: 0, dep: 8 * 3600 + 20 * 60, trackId: 'SM-1' },
          { stationId: 'kawazu', arr: 8 * 3600 + 32 * 60, dep: 8 * 3600 + 33 * 60, trackId: 'KZ-2' },
          { stationId: 'izu_inatori', arr: 8 * 3600 + 40 * 60, dep: 8 * 3600 + 41 * 60, trackId: 'IN-2' },
          { stationId: 'izu_atagawa', arr: 8 * 3600 + 48 * 60, dep: 8 * 3600 + 49 * 60, trackId: 'IA-2' },
          { stationId: 'izu_kogen', arr: 9 * 3600 + 1 * 60, dep: 9 * 3600 + 3 * 60, trackId: 'IK-3' },
          { stationId: 'ito', arr: 9 * 3600 + 19 * 60, dep: 9 * 3600 + 21 * 60, trackId: 'IT-1' },
          { stationId: 'usami', arr: 9 * 3600 + 27 * 60, dep: 9 * 3600 + 30 * 60, trackId: 'US-2' }, // 交換
          { stationId: 'atami', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 50 * 60, trackId: 'AT-3' },
          { stationId: 'yugawara', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'YG-2' },
          { stationId: 'odawara', arr: 10 * 3600 + 8 * 60, dep: 10 * 3600 + 9 * 60, trackId: 'OD-3' },
          { stationId: 'ofuna', arr: 10 * 3600 + 33 * 60, dep: 10 * 3600 + 34 * 60, trackId: 'OF-3' },
          { stationId: 'yokohama', arr: 10 * 3600 + 47 * 60, dep: 10 * 3600 + 48 * 60, trackId: 'YK-3' },
          { stationId: 'shinagawa', arr: 11 * 3600 + 4 * 60, dep: 11 * 3600 + 5 * 60, trackId: 'SG-3' },
          { stationId: 'tokyo', arr: 11 * 3600 + 13 * 60, dep: 0, trackId: 'TY-2' }
        ]
      },
      // 10. 上り 特急 サフィール踊り子4号 (毎時50分 下田発 -> 東京行)
      {
        baseId: 3000,
        nameTpl: 'サフィール{N}号',
        type: 'express',
        direction: 'up',
        stops: [
          { stationId: 'shimoda', arr: 0, dep: 8 * 3600 + 50 * 60, trackId: 'SM-1' },
          { stationId: 'kawazu', arr: 9 * 3600 + 2 * 60, dep: 9 * 3600 + 3 * 60, trackId: 'KZ-2' },
          { stationId: 'izu_atagawa', arr: 9 * 3600 + 17 * 60, dep: 9 * 3600 + 18 * 60, trackId: 'IA-2' },
          { stationId: 'izu_kogen', arr: 9 * 3600 + 30 * 60, dep: 9 * 3600 + 32 * 60, trackId: 'IK-3' },
          { stationId: 'ito', arr: 9 * 3600 + 48 * 60, dep: 9 * 3600 + 50 * 60, trackId: 'IT-1' },
          { stationId: 'atami', arr: 10 * 3600 + 8 * 60, dep: 10 * 3600 + 10 * 60, trackId: 'AT-3' },
          { stationId: 'odawara', pass: true, arr: 10 * 3600 + 27 * 60, dep: 10 * 3600 + 27 * 60, trackId: 'OD-3' },
          { stationId: 'yokohama', arr: 11 * 3600 + 5 * 60, dep: 11 * 3600 + 6 * 60, trackId: 'YK-3' },
          { stationId: 'shinagawa', arr: 11 * 3600 + 21 * 60, dep: 11 * 3600 + 22 * 60, trackId: 'SG-3' },
          { stationId: 'tokyo', arr: 11 * 3600 + 30 * 60, dep: 0, trackId: 'TY-2' }
        ]
      },
      // 11. 上り 快速アクティー2号 (毎時25分 熱海発 -> 東京行)
      {
        baseId: 3520,
        nameTpl: '快速アクティー{N}号',
        type: 'rapid',
        direction: 'up',
        stops: [
          { stationId: 'atami', arr: 0, dep: 8 * 3600 + 25 * 60, trackId: 'AT-2' },
          { stationId: 'yugawara', arr: 8 * 3600 + 32 * 60, dep: 8 * 3600 + 33 * 60, trackId: 'YG-2' },
          { stationId: 'odawara', arr: 8 * 3600 + 46 * 60, dep: 8 * 3600 + 47 * 60, trackId: 'OD-3' },
          { stationId: 'kozu', arr: 8 * 3600 + 54 * 60, dep: 8 * 3600 + 55 * 60, trackId: 'KZ-3' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 6 * 60, dep: 9 * 3600 + 7 * 60, trackId: 'HT-3' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 13 * 60, dep: 9 * 3600 + 14 * 60, trackId: 'CG-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 21 * 60, dep: 9 * 3600 + 22 * 60, trackId: 'FS-2' },
          { stationId: 'ofuna', arr: 9 * 3600 + 27 * 60, dep: 9 * 3600 + 28 * 60, trackId: 'OF-3' },
          { stationId: 'totsuka', arr: 9 * 3600 + 34 * 60, dep: 9 * 3600 + 35 * 60, trackId: 'TT-2' },
          { stationId: 'yokohama', arr: 9 * 3600 + 46 * 60, dep: 9 * 3600 + 47 * 60, trackId: 'YK-3' },
          { stationId: 'kawasaki', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'KW-2' },
          { stationId: 'shinagawa', arr: 10 * 3600 + 7 * 60, dep: 10 * 3600 + 8 * 60, trackId: 'SG-3' },
          { stationId: 'shimbashi', arr: 10 * 3600 + 15 * 60, dep: 10 * 3600 + 16 * 60, trackId: 'SB-2' },
          { stationId: 'tokyo', arr: 10 * 3600 + 19 * 60, dep: 0, trackId: 'TY-1' }
        ]
      },
      // 12. 上り 普通1522M (毎時10分 熱海発 -> 東京行)
      {
        baseId: 1510,
        nameTpl: '普通{ID}',
        type: 'local',
        direction: 'up',
        stops: [
          { stationId: 'atami', arr: 0, dep: 8 * 3600 + 10 * 60, trackId: 'AT-3' },
          { stationId: 'yugawara', arr: 8 * 3600 + 18 * 60, dep: 8 * 3600 + 19 * 60, trackId: 'YG-2' },
          { stationId: 'manazuru', arr: 8 * 3600 + 23 * 60, dep: 8 * 3600 + 24 * 60, trackId: 'MZ-2' },
          { stationId: 'odawara', arr: 8 * 3600 + 37 * 60, dep: 8 * 3600 + 39 * 60, trackId: 'OD-3' },
          { stationId: 'kozu', arr: 8 * 3600 + 47 * 60, dep: 8 * 3600 + 49 * 60, trackId: 'KZ-3' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 4 * 60, dep: 9 * 3600 + 11 * 60, trackId: 'HT-4' }, // 快速待避
          { stationId: 'chigasaki', arr: 9 * 3600 + 17 * 60, dep: 9 * 3600 + 18 * 60, trackId: 'CG-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 26 * 60, dep: 9 * 3600 + 27 * 60, trackId: 'FS-2' },
          { stationId: 'ofuna', arr: 9 * 3600 + 33 * 60, dep: 9 * 3600 + 35 * 60, trackId: 'OF-3' },
          { stationId: 'totsuka', arr: 9 * 3600 + 41 * 60, dep: 9 * 3600 + 42 * 60, trackId: 'TT-2' },
          { stationId: 'yokohama', arr: 9 * 3600 + 54 * 60, dep: 9 * 3600 + 56 * 60, trackId: 'YK-3' },
          { stationId: 'kawasaki', arr: 10 * 3600 + 6 * 60, dep: 10 * 3600 + 7 * 60, trackId: 'KW-2' },
          { stationId: 'shinagawa', arr: 10 * 3600 + 18 * 60, dep: 10 * 3600 + 19 * 60, trackId: 'SG-3' },
          { stationId: 'shimbashi', arr: 10 * 3600 + 26 * 60, dep: 10 * 3600 + 27 * 60, trackId: 'SB-2' },
          { stationId: 'tokyo', arr: 10 * 3600 + 30 * 60, dep: 0, trackId: 'TY-2' }
        ]
      },
      // 13. 上り 普通1524M (毎時45分 熱海発 -> 東京行)
      {
        baseId: 1530,
        nameTpl: '普通{ID}',
        type: 'local',
        direction: 'up',
        stops: [
          { stationId: 'atami', arr: 0, dep: 8 * 3600 + 45 * 60, trackId: 'AT-3' },
          { stationId: 'yugawara', arr: 8 * 3600 + 53 * 60, dep: 8 * 3600 + 54 * 60, trackId: 'YG-2' },
          { stationId: 'manazuru', arr: 8 * 3600 + 58 * 60, dep: 8 * 3600 + 59 * 60, trackId: 'MZ-2' },
          { stationId: 'odawara', arr: 9 * 3600 + 12 * 60, dep: 9 * 3600 + 14 * 60, trackId: 'OD-3' },
          { stationId: 'kozu', arr: 9 * 3600 + 22 * 60, dep: 9 * 3600 + 24 * 60, trackId: 'KZ-3' },
          { stationId: 'hiratsuka', arr: 9 * 3600 + 40 * 60, dep: 9 * 3600 + 42 * 60, trackId: 'HT-3' },
          { stationId: 'chigasaki', arr: 9 * 3600 + 47 * 60, dep: 9 * 3600 + 48 * 60, trackId: 'CG-2' },
          { stationId: 'fujisawa', arr: 9 * 3600 + 56 * 60, dep: 9 * 3600 + 57 * 60, trackId: 'FS-2' },
          { stationId: 'ofuna', arr: 10 * 3600 + 3 * 60, dep: 10 * 3600 + 5 * 60, trackId: 'OF-3' },
          { stationId: 'totsuka', arr: 10 * 3600 + 11 * 60, dep: 10 * 3600 + 12 * 60, trackId: 'TT-2' },
          { stationId: 'yokohama', arr: 10 * 3600 + 24 * 60, dep: 10 * 3600 + 26 * 60, trackId: 'YK-3' },
          { stationId: 'kawasaki', arr: 10 * 3600 + 36 * 60, dep: 10 * 3600 + 37 * 60, trackId: 'KW-2' },
          { stationId: 'shinagawa', arr: 10 * 3600 + 48 * 60, dep: 10 * 3600 + 49 * 60, trackId: 'SG-3' },
          { stationId: 'shimbashi', arr: 10 * 3600 + 56 * 60, dep: 10 * 3600 + 57 * 60, trackId: 'SB-2' },
          { stationId: 'tokyo', arr: 11 * 3600 + 0 * 60, dep: 0, trackId: 'TY-2' }
        ]
      },
      // 14. 上り 伊豆急普通5622M (毎時05分 下田発 -> 熱海行 / 網代交換)
      {
        baseId: 5610,
        nameTpl: '伊豆普通{ID}',
        type: 'local',
        direction: 'up',
        stops: [
          { stationId: 'shimoda', arr: 0, dep: 8 * 3600 + 5 * 60, trackId: 'SM-2' },
          { stationId: 'kawazu', arr: 8 * 3600 + 19 * 60, dep: 8 * 3600 + 20 * 60, trackId: 'KZ-2' },
          { stationId: 'izu_atagawa', arr: 8 * 3600 + 36 * 60, dep: 8 * 3600 + 37 * 60, trackId: 'IA-2' },
          { stationId: 'izu_kogen', arr: 8 * 3600 + 50 * 60, dep: 8 * 3600 + 52 * 60, trackId: 'IK-3' },
          { stationId: 'ito', arr: 9 * 3600 + 12 * 60, dep: 9 * 3600 + 14 * 60, trackId: 'IT-1' },
          { stationId: 'ajiro', arr: 9 * 3600 + 24 * 60, dep: 9 * 3600 + 28 * 60, trackId: 'AJ-2' }, // 交換
          { stationId: 'atami', arr: 9 * 3600 + 42 * 60, dep: 0, trackId: 'AT-1' }
        ]
      }
    ]
  },

  // 互換性アクセサ
  get BASE_CYCLE_TRAINS() {
    const diff = this.currentDifficulty || 'normal';
    return this.DIFFICULTY_PATTERNS[diff] || this.DIFFICULTY_PATTERNS.normal;
  },

  // 難易度設定
  setDifficulty(diff) {
    if (this.DIFFICULTIES[diff]) {
      this.currentDifficulty = diff;
      return true;
    }
    return false;
  },

  // サイクルインデックスから列車一覧を生成する関数
  generateCycleTrains(cycleIndex) {
    const offset = cycleIndex * TrainGame.CONFIG.CYCLE_DURATION;
    const baseTrains = TrainGame.CONFIG.BASE_CYCLE_TRAINS;

    return baseTrains.map((bTrain, idx) => {
      const isDown = bTrain.direction === 'down';
      const num = isDown ? (cycleIndex * 2 + 1) : (cycleIndex * 2 + 2);
      const trainIdNum = bTrain.baseId + num;
      const trainId = `${trainIdNum}M`;

      let name = bTrain.nameTpl
        .replace('{N}', num)
        .replace('{ID}', trainId);

      const stops = bTrain.stops.map(s => ({
        ...s,
        arr: s.arr > 0 ? s.arr + offset : 0,
        dep: s.dep > 0 ? s.dep + offset : 0,
        origArr: s.arr > 0 ? s.arr + offset : 0,
        origDep: s.dep > 0 ? s.dep + offset : 0
      }));

      return {
        id: trainId,
        name: name,
        type: bTrain.type,
        direction: bTrain.direction,
        stops: stops,
        cycleIndex: cycleIndex
      };
    });
  },
  // 突発遅延トラブルイベント
  DELAY_EVENTS: [
    { type: 'crossing_alert', title: '伊豆線内 踏切安全確認', minDelay: 120, maxDelay: 240 },
    { type: 'wind_slowdown', title: '東海道線内 強風徐行運転', minDelay: 90, maxDelay: 180 },
    { type: 'door_reopening', title: '横浜駅 乗降混雑対応', minDelay: 60, maxDelay: 150 },
    { type: 'passenger_medical', title: '熱海駅 急病人救護', minDelay: 180, maxDelay: 300 }
  ]
};
