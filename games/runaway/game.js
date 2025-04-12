function calculateDifficultyLevel(settings) {
    const defaultSettings = {
        maxEnemies: 10,
        enemySpeed: 2,
        bulletSpeed: 5,
        bossStayTime: 10,
        playerLife: 3
    };

    let difficultyScore = 0;
    
    // 各パラメータをチェック
    if (settings.maxEnemies > defaultSettings.maxEnemies) difficultyScore++;
    if (settings.maxEnemies < defaultSettings.maxEnemies) difficultyScore--;
    if (settings.enemySpeed > defaultSettings.enemySpeed) difficultyScore++;
    if (settings.enemySpeed < defaultSettings.enemySpeed) difficultyScore--;
    if (settings.bulletSpeed > defaultSettings.bulletSpeed) difficultyScore++;
    if (settings.bulletSpeed < defaultSettings.bulletSpeed) difficultyScore--;
    if (settings.bossStayTime > defaultSettings.bossStayTime) difficultyScore++;
    if (settings.bossStayTime < defaultSettings.bossStayTime) difficultyScore--;

    // プレイヤーライフによる難易度調整
    const isLifeIncreased = settings.playerLife > defaultSettings.playerLife;
    const isLifeDecreased = settings.playerLife < defaultSettings.playerLife;

    // 難易度の判定
    if (difficultyScore >= 3 && isLifeDecreased) {
        return { level: 'スーパーハード', multiplier: 2.0 };
    } else if (difficultyScore >= 2 && !isLifeIncreased) {
        return { level: 'ハード', multiplier: 1.5 };
    } else if (difficultyScore <= -3 && !isLifeDecreased) {
        return { level: 'スーパーイージー', multiplier: 0.5 };
    } else if (difficultyScore <= -2 && !isLifeDecreased) {
        return { level: 'イージー', multiplier: 0.8 };
    }
    return { level: '普通', multiplier: 1.0 };
}

class Game {
    constructor(settings = {}, difficulty = 0) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // レスポンシブ対応のキャンバスサイズ設定
        this.resizeCanvas();
        
        this.difficulty = difficulty;

        // デフォルト値の設定
        const defaultSettings = {
            maxEnemies: 10,
            enemySpeed: 2,
            bulletSpeed: 5,
            bossStayTime: 10,
            playerLife: 3
        };

        // 難易度判定
        this.gameDifficulty = calculateDifficultyLevel(settings);
        
        this.settings = {
            maxEnemies: (settings.maxEnemies || defaultSettings.maxEnemies) + difficulty,
            enemySpeed: (settings.enemySpeed || defaultSettings.enemySpeed) + difficulty * 0.5,
            bulletSpeed: (settings.bulletSpeed || defaultSettings.bulletSpeed) + difficulty * 0.5,
            bossStayTime: settings.bossStayTime || defaultSettings.bossStayTime,
            playerLife: settings.playerLife || defaultSettings.playerLife
        };
        
        this.player = {
            x: 50,
            y: this.canvas.height / 2,
            width: 30,
            height: 30,
            speed: 5 + difficulty * 0.5,
            life: this.settings.playerLife
        };
        
        this.enemies = [];
        this.bullets = [];
        this.score = 0;
        this.enemyCount = 0;
        this.maxEnemies = this.settings.maxEnemies;
        this.isBossFight = false;
        this.timeStop = false;
        this.isGameOver = false;
        this.isGameCleared = false;
        
        // ベストスコアの読み込み
        try {
            this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        } catch (e) {
            console.error('ベストスコア読み込みエラー:', e);
            this.bestScore = 0; // localStorage失敗時のフォールバック
        }
        
        const bestScoreElement = document.getElementById('best-score');
        if (bestScoreElement) {
            bestScoreElement.innerHTML = `<i class="fas fa-trophy"></i> ベストスコア: ${this.bestScore}`;
        }
        
        // スコア倍率の設定（難易度とレベルの両方を考慮）
        this.scoreMultiplier = this.calculateScoreMultiplier(difficulty);
        
        // UI情報の更新
        this.updateGameInfo();
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    // キャンバスサイズの調整
    resizeCanvas() {
        try {
            const gameContainer = document.querySelector('.game-container');
            const containerWidth = gameContainer.clientWidth;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // スマートフォンかどうかでサイズを調整
            if (this.isMobileDevice()) {
                // AndroidのChromeかどうか判定
                const isAndroidChrome = this.isAndroidChrome();
                
                if (isAndroidChrome) {
                    console.log("Android Chrome検出: 特別なキャンバスサイズ調整を適用");
                    
                    // 横持ち推奨メッセージを強制的に非表示（念のため）
                    const orientationMessage = document.getElementById('orientationMessage');
                    if (orientationMessage) {
                        orientationMessage.style.display = 'none';
                        if (orientationMessage.parentNode) {
                            orientationMessage.parentNode.removeChild(orientationMessage);
                        }
                    }
                    
                    // 画面の向きに基づいて調整
                    const isLandscape = windowWidth > windowHeight;
                    
                    if (isLandscape) {
                        // 横向きの場合、画面幅の85%を使用（余白を増やす）
                        this.canvas.width = Math.min(windowWidth * 0.85, 1200);
                        // 横幅の半分をおおよその高さに設定（アスペクト比維持）
                        this.canvas.height = this.canvas.width / 2;
                    } else {
                        // 縦向きの場合
                        this.canvas.width = Math.min(windowWidth * 0.9, 800);
                        this.canvas.height = this.canvas.width / 2;
                    }
                    
                    // 最小値と最大値の制限
                    this.canvas.width = Math.max(this.canvas.width, 320);
                    this.canvas.height = Math.max(this.canvas.height, 200);
                    
                    // ゲームコンテナのスタイルも調整
                    gameContainer.style.width = this.canvas.width + 'px';
                    gameContainer.style.height = 'auto';
                    gameContainer.style.margin = '0 auto';
                    gameContainer.style.display = 'flex';
                    
                    // キャンバスのスタイルを明示的に設定
                    this.canvas.style.width = '100%';
                    this.canvas.style.height = 'auto';
                    this.canvas.style.display = 'block';
                    this.canvas.style.margin = '0 auto';
                    
                    // リサイズ後、キャンバスがコンテナに確実に表示されるようにする
                    setTimeout(() => {
                        if (this.canvas.parentNode !== gameContainer) {
                            try {
                                gameContainer.appendChild(this.canvas);
                            } catch (e) {
                                console.error("キャンバス再配置エラー:", e);
                            }
                        }
                    }, 0);
                    
                } else {
                    // 他のモバイルデバイス（iOSなど）の場合
                    this.canvas.width = containerWidth;
                    this.canvas.height = containerWidth / 2; // アスペクト比2:1
                    
                    // 最小高さの設定
                    const minHeight = 300;
                    if (this.canvas.height < minHeight) {
                        this.canvas.height = minHeight;
                    }
                }
            } else {
                // デスクトップの場合は固定サイズ
                this.canvas.width = 800;
                this.canvas.height = 400;
            }
            
            // コンソールにサイズ情報を出力（デバッグ用）
            console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}, Container width: ${containerWidth}, Window: ${windowWidth}x${windowHeight}`);
            
            // タッチコントロールの位置も更新
            if (this.touchControls) {
                this.updateTouchControlsPosition();
            }
        } catch (error) {
            console.error("resizeCanvas中にエラーが発生:", error);
        }
    }
    
    // ゲーム情報の更新
    updateGameInfo() {
        try {
            const scoreEl = document.getElementById('score');
            const lifeEl = document.getElementById('life');
            const bestScoreEl = document.getElementById('best-score');
            
            if (scoreEl) scoreEl.innerHTML = `<i class="fas fa-star"></i> スコア: ${this.score}`;
            if (lifeEl) lifeEl.innerHTML = `<i class="fas fa-heart"></i> ライフ: ${this.player.life}`;
            if (bestScoreEl) bestScoreEl.innerHTML = `<i class="fas fa-trophy"></i> ベストスコア: ${this.bestScore}`;
        } catch (e) {
            console.error('ゲーム情報更新エラー:', e);
        }
    }

    calculateScoreMultiplier(difficulty) {
        // レベルによる基本倍率（2のべき乗）とゲーム難易度による倍率を掛け合わせる
        return Math.pow(2, difficulty) * this.gameDifficulty.multiplier;
    }

    setupEventListeners() {
        this.keys = {};
        
        // キーボード操作
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                this.activateTimeStop();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // タッチ操作用の変数
        this.touchControls = {
            joystick: {
                active: false,
                startX: 0,
                startY: 0,
                moveX: 0,
                moveY: 0,
                baseRadius: 40,
                moveRadius: 30
            },
            timeStopBtn: {
                x: 0,
                y: 0,
                radius: 40
            }
        };
        
        // タッチイベント
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        
        // タイムストップボタンの位置を設定
        this.updateTouchControlsPosition();
        
        // リサイズイベント
        window.addEventListener('resize', () => {
            this.updateTouchControlsPosition();
        });
    }
    
    // タッチコントロールの位置を更新
    updateTouchControlsPosition() {
        // ジョイスティックの初期位置（左下）
        this.touchControls.joystick.startX = 80;
        this.touchControls.joystick.startY = this.canvas.height - 80;
        
        // タイムストップボタンの位置（右下）
        this.touchControls.timeStopBtn.x = this.canvas.width - 80;
        this.touchControls.timeStopBtn.y = this.canvas.height - 80;
    }
    
    // タッチ開始時の処理
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const touchX = touch.clientX - this.canvas.getBoundingClientRect().left;
            const touchY = touch.clientY - this.canvas.getBoundingClientRect().top;
            
            // タイムストップボタンのタッチ判定
            const timeStopBtn = this.touchControls.timeStopBtn;
            const distanceToTimeStop = Math.sqrt(
                Math.pow(touchX - timeStopBtn.x, 2) + 
                Math.pow(touchY - timeStopBtn.y, 2)
            );
            
            if (distanceToTimeStop <= timeStopBtn.radius) {
                this.activateTimeStop();
                return;
            }
            
            // ジョイスティックのタッチ判定（左側半分をジョイスティックエリアとする）
            if (touchX < this.canvas.width / 2 && !this.touchControls.joystick.active) {
                this.touchControls.joystick.active = true;
                this.touchControls.joystick.startX = touchX;
                this.touchControls.joystick.startY = touchY;
                this.touchControls.joystick.moveX = touchX;
                this.touchControls.joystick.moveY = touchY;
                this.touchControls.joystick.identifier = touch.identifier;
            }
        }
    }
    
    // タッチ移動時の処理
    handleTouchMove(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // ジョイスティックの操作
            if (this.touchControls.joystick.active && 
                touch.identifier === this.touchControls.joystick.identifier) {
                
                const touchX = touch.clientX - this.canvas.getBoundingClientRect().left;
                const touchY = touch.clientY - this.canvas.getBoundingClientRect().top;
                
                // ジョイスティックの移動距離と角度を計算
                const dx = touchX - this.touchControls.joystick.startX;
                const dy = touchY - this.touchControls.joystick.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // 最大移動半径を制限
                const maxRadius = this.touchControls.joystick.baseRadius;
                
                if (distance <= maxRadius) {
                    this.touchControls.joystick.moveX = touchX;
                    this.touchControls.joystick.moveY = touchY;
                } else {
                    // 最大半径で制限
                    const angle = Math.atan2(dy, dx);
                    this.touchControls.joystick.moveX = 
                        this.touchControls.joystick.startX + Math.cos(angle) * maxRadius;
                    this.touchControls.joystick.moveY = 
                        this.touchControls.joystick.startY + Math.sin(angle) * maxRadius;
                }
                
                // 仮想キー状態の更新
                const moveRatio = 0.3; // 移動の感度調整 (0.5から0.3に下げて感度を上げる)
                this.keys['ArrowRight'] = dx > 10 * moveRatio;
                this.keys['ArrowLeft'] = dx < -10 * moveRatio;
                this.keys['ArrowDown'] = dy > 10 * moveRatio;
                this.keys['ArrowUp'] = dy < -10 * moveRatio;
            }
        }
    }
    
    // タッチ終了時の処理
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // ジョイスティックのタッチが終了した場合
            if (this.touchControls.joystick.active && 
                touch.identifier === this.touchControls.joystick.identifier) {
                
                this.touchControls.joystick.active = false;
                this.touchControls.joystick.moveX = this.touchControls.joystick.startX;
                this.touchControls.joystick.moveY = this.touchControls.joystick.startY;
                
                // 仮想キー状態のリセット
                this.keys['ArrowRight'] = false;
                this.keys['ArrowLeft'] = false;
                this.keys['ArrowDown'] = false;
                this.keys['ArrowUp'] = false;
            }
        }
    }
    
    // タイムストップ機能を起動
    activateTimeStop() {
        if (!this.timeStop) {
            this.timeStop = true;
            setTimeout(() => {
                this.timeStop = false;
            }, 2000);
        }
    }

    spawnEnemy() {
        if (this.enemyCount >= this.maxEnemies && !this.isBossFight) {
            this.spawnBoss();
            return;
        }

        if (this.enemyCount < this.maxEnemies && Math.random() < 0.02) {
            const enemy = {
                x: this.canvas.width,
                y: Math.random() * (this.canvas.height - 40),
                width: 30,
                height: 30,
                speed: this.settings.enemySpeed + Math.random() * 2,
                pattern: Math.random() < 0.5 ? 'straight' : 'zigzag',
                bulletCount: Math.floor(this.enemyCount / 3) + 1 + this.difficulty,
                direction: 1
            };
            this.enemies.push(enemy);
            this.enemyCount++;
        }
    }

    spawnBoss() {
        this.isBossFight = true;
        const boss = {
            x: this.canvas.width - 100,
            y: this.canvas.height / 2,
            width: 90,
            height: 90,
            speed: 3,
            health: 10,
            pattern: 'random',
            bulletCount: 3 + Math.ceil(3 * (Math.pow(1.5, this.difficulty) - 1)),
            timeAlive: 0,
            maxTime: this.settings.bossStayTime,
            moveRange: {
                minX: this.canvas.width * 0.5,
                maxX: this.canvas.width - 90,
                minY: 0,
                maxY: this.canvas.height - 90,
                scale: 1 + this.difficulty * 0.5
            }
        };
        this.enemies.push(boss);
    }

    spawnBullet(enemy) {
        for (let i = 0; i < enemy.bulletCount; i++) {
            setTimeout(() => {
                if (!enemy.isDead) {
                    const bullet = {
                        x: enemy.x,
                        y: enemy.y + enemy.height / 2,
                        radius: 5,
                        speed: this.settings.bulletSpeed,
                        angle: Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x)
                    };
                    this.bullets.push(bullet);
                }
            }, i * 200);
        }
    }

    updatePlayer() {
        if (this.keys['ArrowUp']) this.player.y = Math.max(0, this.player.y - this.player.speed);
        if (this.keys['ArrowDown']) this.player.y = Math.min(this.canvas.height - this.player.height, this.player.y + this.player.speed);
        if (this.keys['ArrowLeft']) this.player.x = Math.max(0, this.player.x - this.player.speed);
        if (this.keys['ArrowRight']) this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
    }

    updateEnemies() {
        if (this.timeStop) return;

        this.enemies.forEach(enemy => {
            if (enemy.pattern === 'straight') {
                enemy.x -= enemy.speed;
            } else if (enemy.pattern === 'zigzag') {
                enemy.x -= enemy.speed;
                enemy.y += Math.sin(enemy.x / 30) * 3;
            } else if (enemy.pattern === 'random') {
                // ボスの場合は時間経過を秒単位で記録（1/60秒ごとに更新）
                enemy.timeAlive += 1/60;

                const range = enemy.moveRange;
                if (range) {
                    if (enemy.timeAlive >= enemy.maxTime) {
                        // ボスの退場アニメーション
                        if (!enemy.isRetreating) {
                            enemy.isRetreating = true;
                            enemy.retreatPhase = 0;
                            enemy.initialY = enemy.y;
                            enemy.jumpHeight = 100;
                            enemy.jumpSpeed = 15;
                            enemy.jumpCount = 0;
                            enemy.maxJumps = 5;
                            enemy.isJumpingInPlace = true;
                        }
                        
                        // その場でのジャンプと右方向への移動を制御
                        enemy.retreatPhase += 0.1;
                        
                        if (enemy.isJumpingInPlace) {
                            // その場でのジャンプ
                            enemy.y = enemy.initialY - Math.abs(Math.sin(enemy.retreatPhase * Math.PI)) * enemy.jumpHeight;
                            
                            // ジャンプの完了を検出（下降して元の位置に戻ったとき）
                            if (enemy.retreatPhase >= 1) {
                                enemy.jumpCount++;
                                enemy.retreatPhase = 0;
                                
                                // 指定回数のジャンプが完了したら右方向への移動を開始
                                if (enemy.jumpCount >= enemy.maxJumps) {
                                    enemy.isJumpingInPlace = false;
                                    enemy.retreatPhase = 0;
                                }
                            }
                        } else {
                            // 右方向へのジャンプしながらの移動
                            enemy.x += enemy.jumpSpeed;
                            enemy.y = enemy.initialY - Math.abs(Math.sin(enemy.retreatPhase * Math.PI)) * enemy.jumpHeight;
                        }
                        
                        // 画面外に出たらクリア
                        if (enemy.x > this.canvas.width + enemy.width) {
                            enemy.isDead = true;
                            if (this.isBossFight) {
                                // ボスクリア時にボーナススコアは付与しない
                                this.gameCleared();
                            }
                        }
                    } else {
                        // 通常の動き
                        const centerX = (range.maxX + range.minX) / 2;
                        const centerY = (range.maxY + range.minY) / 2;
                        const rangeX = (range.maxX - range.minX) / 2 * range.scale;
                        const rangeY = (range.maxY - range.minY) / 2 * range.scale;

                        enemy.x += (Math.random() - 0.5) * enemy.speed * range.scale;
                        enemy.y += (Math.random() - 0.5) * enemy.speed * range.scale;

                        enemy.x = Math.max(centerX - rangeX, Math.min(centerX + rangeX, enemy.x));
                        enemy.y = Math.max(centerY - rangeY, Math.min(centerY + rangeY, enemy.y));
                    }
                }
            }

            if (Math.random() < 0.01 && !enemy.isDead && !enemy.isRetreating) {
                this.spawnBullet(enemy);
            }
        });

        // 敵のフィルタリング条件を修正
        this.enemies = this.enemies.filter(enemy => {
            // ボスの場合（pattern === 'random'）
            if (enemy.pattern === 'random') {
                return !enemy.isDead; // ボスは明示的にisDead = trueになるまで残す
            }
            
            // 通常の敵は画面外に出るか撃破されたら除去（スコア加算なし）
            return enemy.x > -enemy.width && !enemy.isDead;
        });
    }

    updateBullets() {
        if (this.timeStop) return;

        this.bullets.forEach(bullet => {
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
        });

        this.bullets = this.bullets.filter(bullet => 
            bullet.x > 0 && bullet.x < this.canvas.width &&
            bullet.y > 0 && bullet.y < this.canvas.height
        );
    }

    checkCollisions() {
        if (this.isGameOver || this.isGameCleared) return;

        let isHit = false;  // 衝突判定フラグ

        // プレイヤーと敵の衝突
        this.enemies.forEach(enemy => {
            if (!enemy.isDead && this.checkCollision(this.player, enemy)) {
                enemy.isDead = true;
                isHit = true;
            }
        });

        // プレイヤーと弾の衝突（Font Awesomeアイコン用に判定を調整）
        this.bullets.forEach(bullet => {
            if (!bullet.isDead) {
                // アイコンの中心からの距離で判定
                const dx = bullet.x - (this.player.x + this.player.width/2);
                const dy = bullet.y - (this.player.y + this.player.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // アイコンサイズの半分程度を判定半径とする
                const hitRadius = this.player.width / 2;
                
                if (distance < hitRadius) {
                    bullet.isDead = true;
                    isHit = true;
                }
            }
        });

        // 衝突があった場合のライフ処理
        if (isHit) {
            this.player.life--;
            // ライフが0以下になった場合のみゲームオーバー
            if (this.player.life <= 0) {
                this.gameOver();
            }
        }

        // 死亡した弾を削除
        this.bullets = this.bullets.filter(bullet => !bullet.isDead);
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    showResultModal(isCleared) {
        const modal = document.getElementById('resultModal');
        const modalContent = document.querySelector('.modal-content');
        const resultTitle = document.getElementById('resultTitle');
        const finalScore = document.getElementById('finalScore');
        const bestScore = document.getElementById('bestScore');
        const newRecordBadge = document.getElementById('newRecordBadge');
        const finalLevel = document.getElementById('finalLevel');
        const finalDifficulty = document.getElementById('finalDifficulty');
        
        if (!modal || !modalContent || !resultTitle || !finalScore || !bestScore || !newRecordBadge) {
            console.error('リザルトモーダル要素が見つかりません');
            return;
        }
        
        // AndroidのChromeでの表示問題対策
        if (this.isAndroidChrome()) {
            console.log("Android Chrome検出: 特別な表示処理を適用");
            
            // モーダル要素をゲームキャンバスの親要素に直接追加
            const gameContainer = document.querySelector('.game-container');
            if (gameContainer && gameContainer.contains(modal) === false) {
                try {
                    // 一度DOMから削除して再追加
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                    gameContainer.appendChild(modal);
                    
                    // スタイル強制更新のための処理
                    void modal.offsetWidth;
                } catch (e) {
                    console.error("モーダル要素の移動エラー:", e);
                }
            }
            
            // モーダルを最前面に配置するためのスタイル調整
            modal.style.position = 'absolute';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '100000';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // より暗く
            
            // ゲームのアニメーションを停止
            window.cancelAnimationFrame(this.animationFrameId);
            
            // DOM更新後に表示するためにさらに遅延
            setTimeout(() => {
                modal.style.display = 'block';
                
                // さらに子要素の表示を保証するため
                if (modalContent) {
                    modalContent.style.visibility = 'visible';
                    modalContent.style.opacity = '1';
                }
            }, 50);
        } else {
            // 通常のブラウザ向け処理
            modal.style.display = 'block';
        }
        
        // レベルと難易度の表示
        if (finalLevel) finalLevel.textContent = `${this.difficulty + 1}`;
        if (finalDifficulty) finalDifficulty.textContent = this.gameDifficulty.level;

        // スコアの更新
        finalScore.textContent = this.score.toString();
        bestScore.textContent = this.bestScore.toString();

        // タイトルの設定
        if (isCleared) {
            resultTitle.innerHTML = `
                <i class="fas fa-trophy"></i> ステージクリア！ <i class="fas fa-trophy"></i><br>
                <span style="font-size: 0.6em; color: #4df; font-weight: normal;">
                    <i class="fas fa-keyboard"></i> スペースキーまたは下のボタンを押して次のレベルへ
                </span>
            `;
        } else {
            resultTitle.innerHTML = `
                <i class="fas fa-skull"></i> ゲームオーバー <i class="fas fa-skull"></i><br>
                <span style="font-size: 0.6em; color: #4df; font-weight: normal;">
                    <i class="fas fa-keyboard"></i> スペースキーまたは下のボタンを押してリトライ
                </span>
            `;
        }

        // ベストスコアの更新確認
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            try {
                localStorage.setItem('bestScore', this.bestScore.toString());
            } catch (e) {
                console.error('ベストスコア保存エラー:', e);
                // localStorage失敗時でもメモリ上のbestScoreは更新済み
            }
            newRecordBadge.style.display = 'inline-block';
            bestScore.textContent = this.bestScore.toString();
        } else {
            newRecordBadge.style.display = 'none';
        }

        // レイアウトをリセット（横持ち用のスタイルを適用するためのトリガー）
        void modalContent.offsetWidth;
        
        // リサイズハンドラーの定義
        const handleResize = () => {
            if (modalContent) {
                const isLandscape = window.innerWidth > window.innerHeight;
                
                // レイアウトクラスの切り替え
                if (isLandscape) {
                    modalContent.classList.add('landscape-layout');
                } else {
                    modalContent.classList.remove('landscape-layout');
                }
                
                // PC/モバイル判定とボタン幅の調整
                if (!this.isMobileDevice()) {
                    // PC向けの最適化
                    const availableWidth = window.innerWidth;
                    // モーダルの最大横幅を画面サイズに応じて調整
                    const modalWidth = Math.min(620, availableWidth * 0.85);
                    modalContent.style.maxWidth = `${modalWidth}px`;
                    
                    // ボタンの最適なサイズを計算
                    const buttonContainer = document.querySelector('.modal-buttons');
                    if (buttonContainer) {
                        const containerWidth = buttonContainer.clientWidth;
                        const buttonCount = document.querySelectorAll('.modal-buttons button').length;
                        const optimalButtonWidth = Math.min(
                            220, // 最大幅
                            Math.floor((containerWidth - (buttonCount - 1) * 20) / buttonCount) // ボタン間のギャップを考慮
                        );
                        
                        // ボタンサイズの設定（最小値は確保）
                        const buttons = document.querySelectorAll('.modal-buttons button');
                        buttons.forEach(button => {
                            const minButtonWidth = Math.max(160, optimalButtonWidth);
                            button.style.minWidth = `${minButtonWidth}px`;
                            button.style.maxWidth = `${minButtonWidth + 40}px`; // 最大幅も制限
                            // ボタンが小さすぎる場合はパディングを調整
                            if (minButtonWidth < 180) {
                                button.style.padding = '12px 14px';
                                button.style.fontSize = '1em';
                            }
                        });
                        
                        // シェアボタンのサイズも調整
                        const shareButtons = document.querySelectorAll('.share-button');
                        shareButtons.forEach(button => {
                            button.style.minWidth = `${Math.max(160, optimalButtonWidth)}px`;
                        });
                    }
                } else {
                    // モバイル向けの最適化
                    modalContent.style.maxWidth = '95%';
                    
                    if (!isLandscape) {
                        // 縦持ち時は横幅制限を解除
                        const buttons = document.querySelectorAll('.modal-buttons button, .share-button');
                        buttons.forEach(button => {
                            button.style.minWidth = 'unset';
                            button.style.maxWidth = '100%';
                        });
                    }
                }
            }
        };
        
        // モーダルの表示
        setTimeout(() => {
            // 少し遅延させてDOMに確実に反映させる（AndroidのChromeの問題対策）
            modal.style.display = 'block';
            
            // 初期レイアウトの設定
            handleResize();
            
            // リサイズイベントのリスナー登録
            window.addEventListener('resize', handleResize);
        }, 50); // 50ミリ秒の遅延

        // スペースキーでリトライできるようにイベントリスナーを追加
        const handleKeyPress = (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                window.removeEventListener('keydown', handleKeyPress);
                window.removeEventListener('resize', handleResize);
                modal.style.display = 'none';
                this.retry(this.difficulty + (isCleared ? 1 : 0));
            }
        };
        window.addEventListener('keydown', handleKeyPress);

        // ボタンの設定
        const retryButton = document.querySelector('.modal-buttons button:first-child');
        const settingsButton = document.querySelector('.modal-buttons button:last-child');
        
        // ボタンのテキストを状況に応じて変更
        if (retryButton) {
            if (isCleared) {
                retryButton.innerHTML = '<i class="fas fa-arrow-right"></i> 次のレベルへ';
            } else {
                retryButton.innerHTML = '<i class="fas fa-redo"></i> リトライ';
            }
            
            // リトライ/次のレベルボタンのクリックイベント
            retryButton.onclick = () => {
                window.removeEventListener('keydown', handleKeyPress);
                window.removeEventListener('resize', handleResize);
                modal.style.display = 'none';
                this.retry(this.difficulty + (isCleared ? 1 : 0));
            };
        }
        
        if (settingsButton) {
            settingsButton.innerHTML = '<i class="fas fa-cog"></i> 設定に戻る';
            
            // 設定に戻るボタンのクリックイベント
            settingsButton.onclick = () => {
                window.removeEventListener('keydown', handleKeyPress);
                window.removeEventListener('resize', handleResize);
                modal.style.display = 'none';
                this.showSettings();
            };
        }
    }

    gameOver() {
        this.isGameOver = true;
        
        // 少し遅延させてモーダルを表示（Androidの表示問題対策）
        setTimeout(() => {
            this.showResultModal(false);
        }, 100);
    }

    gameCleared() {
        this.isGameCleared = true;
        
        // 少し遅延させてモーダルを表示（Androidの表示問題対策）
        setTimeout(() => {
            this.showResultModal(true);
        }, 100);
    }
    
    // AndroidのChromeかどうかの判定
    isAndroidChrome() {
        return /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
    }

    retry(newDifficulty = this.difficulty) {
        const gameContainer = document.querySelector('.game-container');
        
        // ゲームコンテナの表示方法を修正（displayをflexに変更）
        gameContainer.style.display = 'flex';
        
        // AndroidのChromeの場合は特別な処理
        if (this.isAndroidChrome()) {
            console.log("Android Chrome検出: retry時にコンテナサイズを最適化");
            
            // 画面の向きチェック
            const isLandscape = window.innerWidth > window.innerHeight;
            const windowWidth = window.innerWidth;
            
            // 画面幅の95%を使用
            gameContainer.style.width = (windowWidth * 0.95) + 'px';
            gameContainer.style.maxWidth = '1200px';
            gameContainer.style.margin = '0 auto';
            
            // 横持ち推奨メッセージを強制的に非表示（念のため）
            const orientationMessage = document.getElementById('orientationMessage');
            if (orientationMessage) {
                orientationMessage.style.display = 'none';
                if (orientationMessage.parentNode) {
                    orientationMessage.parentNode.removeChild(orientationMessage);
                }
            }
        }
        
        // 新しいゲームインスタンスを作成
        window.game = new Game(this.settings, newDifficulty);
    }

    showSettings() {
        const gameContainer = document.querySelector('.game-container');
        const settingsPanel = document.querySelector('.settings-panel');
        gameContainer.style.display = 'none';
        settingsPanel.style.display = 'block';
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景のグラデーション
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0c1445');
        gradient.addColorStop(1, '#1c2e4a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // グリッド線
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        const gridSize = 40;
        
        for (let i = 0; i < this.canvas.width; i += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let i = 0; i < this.canvas.height; i += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }
        
        // タイムストップエフェクト
        if (this.timeStop) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // プレイヤーの描画（childのアイコン）
        this.ctx.fillStyle = '#4df';
        this.ctx.font = '30px FontAwesome';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = '#4df';
        this.ctx.shadowBlur = this.timeStop ? 20 : 10;
        this.ctx.fillText('\uf1ae', this.player.x + this.player.width/2, this.player.y + this.player.height/2); // child
        
        // 敵の描画（チェスの駒のアイコン）
        this.enemies.forEach(enemy => {
            if (enemy.pattern === 'random') {
                // ボスの描画（チェスのナイト - 2倍サイズ）
                this.ctx.fillStyle = '#ff3333';
                this.ctx.font = '80px FontAwesome';
                this.ctx.shadowColor = '#ff3333';
                this.ctx.shadowBlur = 15;
                this.ctx.fillText('\uf441', enemy.x + enemy.width/2, enemy.y + enemy.height/2); // chess-knight
                
                // ボスの残り時間バーの表示
                if (!enemy.isRetreating) {
                    const barWidth = enemy.width;
                    const barHeight = 10;
                    const barX = enemy.x;
                    const barY = enemy.y - 20;
                    const timeRatio = 1 - (enemy.timeAlive / enemy.maxTime);
                    
                    // 背景バー
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    this.ctx.fillRect(barX, barY, barWidth, barHeight);
                    
                    // 残り時間バー
                    this.ctx.fillStyle = timeRatio > 0.3 ? '#00ff00' : '#ff0000';
                    this.ctx.fillRect(barX, barY, barWidth * timeRatio, barHeight);
                    this.ctx.shadowBlur = 15;
                }
            } else {
                // 通常の敵の描画（チェスのポーン）
                this.ctx.fillStyle = '#ff9966';
                this.ctx.font = '30px FontAwesome';
                this.ctx.shadowColor = '#ff9966';
                this.ctx.shadowBlur = 10;
                this.ctx.fillText('\uf443', enemy.x + enemy.width/2, enemy.y + enemy.height/2); // chess-pawn
            }
        });
                
        // 弾の描画（流星のアイコン）
        this.ctx.fillStyle = '#ffff66';
        this.ctx.shadowColor = '#ffff66';
        this.ctx.shadowBlur = 15;
        this.ctx.font = '20px FontAwesome';
        this.bullets.forEach(bullet => {
            this.ctx.fillText('\uf753', bullet.x, bullet.y); // meteor
        });
        
        // タイムストップエフェクト中の追加表現
        if (this.timeStop) {
            // タイムストップ中の追加エフェクト（砂時計のアイコン）
            this.ctx.fillStyle = 'rgba(77, 255, 255, 0.3)';
            this.ctx.font = '60px FontAwesome';
            this.ctx.shadowColor = '#4df';
            this.ctx.shadowBlur = 20;
            this.ctx.fillText('\uf251', this.canvas.width/2, this.canvas.height/2); // hourglass-start
        }

        // レベルと難易度の表示
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#4df';
        this.ctx.font = 'bold 24px "Noto Sans JP"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(`LEVEL ${this.difficulty + 1} - ${this.gameDifficulty.level}`, this.canvas.width / 2, 10);
        this.ctx.shadowBlur = 0;
        
        // スコア情報の更新
        this.updateGameInfo();
        
        // モバイルデバイスの場合のみタッチコントロールを描画
        if (this.isMobileDevice()) {
            this.drawTouchControls();
        }
    }
    
    // タッチコントロールの描画
    drawTouchControls() {
        // ジョイスティック
        const joystick = this.touchControls.joystick;
        
        // ジョイスティックの基部（半透明の円）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(joystick.startX, joystick.startY, joystick.baseRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // ジョイスティックのハンドル（動く部分）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(joystick.moveX, joystick.moveY, joystick.moveRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // タイムストップボタン
        const timeStopBtn = this.touchControls.timeStopBtn;
        
        // タイムストップの背景円
        this.ctx.fillStyle = this.timeStop ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(timeStopBtn.x, timeStopBtn.y, timeStopBtn.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // タイムストップのアイコン（時計の形）
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(timeStopBtn.x, timeStopBtn.y, timeStopBtn.radius * 0.6, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // 時計の針
        this.ctx.beginPath();
        this.ctx.moveTo(timeStopBtn.x, timeStopBtn.y);
        this.ctx.lineTo(timeStopBtn.x, timeStopBtn.y - timeStopBtn.radius * 0.5);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(timeStopBtn.x, timeStopBtn.y);
        this.ctx.lineTo(timeStopBtn.x + timeStopBtn.radius * 0.4, timeStopBtn.y);
        this.ctx.stroke();
    }
    
    // モバイルデバイスかどうかの判定
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    gameLoop() {
        if (this.isGameOver || this.isGameCleared) return;
        
        try {
            // 時間経過でのスコア加算（生き残った時間に比例）
            if (!this.timeStop) {
                // 生存時間による得点：基本1点 × 難易度倍率
                this.score += 1 * this.scoreMultiplier;
            }
            
            // スコア情報の更新
            this.updateGameInfo();
            
            // ゲームの更新処理
            this.spawnEnemy();
            this.updatePlayer();
            this.updateEnemies();
            this.updateBullets();
            this.checkCollisions();
            
            // 描画処理
            this.draw();
        } catch (e) {
            console.error('ゲームループエラー:', e);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// SNS共有機能を更新
function shareOnTwitter() {
    const finalScore = document.getElementById('finalScore');
    const newRecordBadge = document.getElementById('newRecordBadge');
    let text = 'クロノスサーガを遊びました！時を止めて敵を回避するアクションゲーム！';
    
    if (window.game && finalScore) {
        text = `クロノスサーガで${finalScore.textContent}点を達成！` +
               `${newRecordBadge && newRecordBadge.style.display === 'inline-block' ? '【新記録達成！】' : ''}` +
               ` レベル${window.game.difficulty + 1}（${window.game.gameDifficulty.level}）まで到達！時を止めて敵を回避するアクションゲーム！`;
    }
    
    const url = 'https://akira-kano.github.io/chronos24/games/runaway/index.html';
    const hashtags = 'クロノスサーガ,ゲーム';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtags)}`, '_blank');
}

function shareOnLine() {
    const finalScore = document.getElementById('finalScore');
    const newRecordBadge = document.getElementById('newRecordBadge');
    let text = 'クロノスサーガを遊びました！時を止めて敵を回避するアクションゲーム！';
    
    if (window.game && finalScore) {
        text = `クロノスサーガで${finalScore.textContent}点を達成！` +
               `${newRecordBadge && newRecordBadge.style.display === 'inline-block' ? '【新記録達成！】' : ''}` +
               ` レベル${window.game.difficulty + 1}（${window.game.gameDifficulty.level}）まで到達！時を止めて敵を回避するアクションゲーム！`;
    }
    
    const url = 'https://akira-kano.github.io/chronos24/games/runaway/index.html';
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

// リトライ処理の追加（HTML側から呼び出されるグローバル関数）
function retryGame() {
    if (window.game) {
        const modal = document.getElementById('resultModal');
        if (modal) {
            try {
                // モーダルを非表示にする前にアニメーション
                modal.style.opacity = '0';
                
                // 少し遅延させてから非表示にしてゲームを再開
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.style.opacity = '1'; // 次回のためにopacityをリセット
                    
                    // ゲームの再開処理
                    const isCleared = window.game.isGameCleared;
                    const newDifficulty = window.game.difficulty + (isCleared ? 1 : 0);
                    
                    // AndroidのChromeの全画面モードの場合は特別な処理
                    if (window.game.isAndroidChrome()) {
                        // ゲームコンテナに追加されていた場合はbodyに戻す
                        if (modal.parentNode && modal.parentNode.classList.contains('game-container')) {
                            document.body.appendChild(modal);
                        }
                    }
                    
                    // ゲームを再開
                    window.game.retry(newDifficulty);
                }, 300);
            } catch (e) {
                console.error("リトライ処理エラー:", e);
                // エラーが発生しても続行を試みる
                window.game.retry(window.game.difficulty + (window.game.isGameCleared ? 1 : 0));
            }
        }
    }
}

// 設定画面に戻るグローバル関数
function backToSettings() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        try {
            // モーダルを非表示にする前にアニメーション
            modal.style.opacity = '0';
            
            // 少し遅延させてから設定画面を表示
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '1'; // 次回のためにopacityをリセット
                
                // AndroidのChromeの全画面モードの場合は特別な処理
                if (window.game && window.game.isAndroidChrome()) {
                    // ゲームコンテナに追加されていた場合はbodyに戻す
                    if (modal.parentNode && modal.parentNode.classList.contains('game-container')) {
                        document.body.appendChild(modal);
                    }
                }
                
                // 設定画面を表示
                if (window.game) {
                    window.game.showSettings();
                } else {
                    // ゲームインスタンスがない場合は直接表示を切り替え
                    const gameContainer = document.querySelector('.game-container');
                    const settingsPanel = document.querySelector('.settings-panel');
                    if (gameContainer) gameContainer.style.display = 'none';
                    if (settingsPanel) settingsPanel.style.display = 'block';
                }
            }, 300);
        } catch (e) {
            console.error("設定画面に戻る処理エラー:", e);
            // エラーが発生しても続行を試みる
            if (window.game) {
                window.game.showSettings();
            }
        }
    }
}

window.onload = () => {
    const startButton = document.getElementById('startGame');
    const settingsPanel = document.querySelector('.settings-panel');

    // ゲーム開始処理
    function startGame() {
        const maxEnemies = parseInt(document.getElementById('maxEnemies').value);
        const enemySpeed = parseFloat(document.getElementById('enemySpeed').value);
        const bulletSpeed = parseFloat(document.getElementById('bulletSpeed').value);
        const bossStayTime = parseInt(document.getElementById('bossStayTime').value);
        const playerLife = parseInt(document.getElementById('playerLife').value);

        const settings = {
            maxEnemies,
            enemySpeed,
            bulletSpeed,
            bossStayTime,
            playerLife
        };

        // 設定パネルを非表示
        document.querySelector('.settings-panel').style.display = 'none';
        
        // AndroidとiOSを検出
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isChrome = /Chrome/i.test(navigator.userAgent);
        const isMobile = isAndroid || isIOS;
        
        // ゲーム開始時に横持ち推奨メッセージを強制的に非表示にする
        const orientationMessage = document.getElementById('orientationMessage');
        if (orientationMessage) {
            // 複数の方法で確実に非表示にする
            orientationMessage.style.display = 'none';
            orientationMessage.classList.remove('mobile-only');
            orientationMessage.classList.add('hidden');
            
            // Android Chromeでの問題に対処するため
            if (isAndroid && isChrome) {
                console.log("Android Chrome検出: 横持ちメッセージを完全に削除");
                // 要素をDOM上から完全に削除
                if (orientationMessage.parentNode) {
                    orientationMessage.parentNode.removeChild(orientationMessage);
                }
                
                // 横持きメッセージのリスナーも削除（ある場合）
                window.removeEventListener('orientationchange', window.checkOrientation);
                window.removeEventListener('resize', window.checkOrientation);
            }
        }
        
        try {
            // ゲームコンテナを表示する前に適切なサイズを設定
            const gameContainer = document.querySelector('.game-container');
            
            // AndroidのChromeの場合は特別な処理
            if (isAndroid && isChrome) {
                console.log("Android Chrome検出: コンテナサイズを最適化");
                
                // 画面の向きチェック
                const isLandscape = window.innerWidth > window.innerHeight;
                const windowWidth = window.innerWidth;
                
                // 画面幅の95%を使用
                gameContainer.style.width = (windowWidth * 0.95) + 'px';
                gameContainer.style.maxWidth = '1200px';
                gameContainer.style.margin = '0 auto';
                
                // ゲームキャンバスのスタイルを直接調整
                const gameCanvas = document.getElementById('gameCanvas');
                if (gameCanvas) {
                    gameCanvas.style.width = '100%';
                    gameCanvas.style.height = 'auto';
                    gameCanvas.style.display = 'block';
                    console.log("Canvas style updated");
                }
            }
            
            // ゲームコンテナを必ずflex表示に
            gameContainer.style.display = 'flex';
            console.log("Game container displayed as flex");
            
            // モーダル要素を適切な場所に配置（Androidの全画面モード対策）
            const resultModal = document.getElementById('resultModal');
            if (resultModal && isAndroid) {
                // AndroidではモーダルをDOMの最上位に配置
                if (resultModal.parentNode) {
                    resultModal.parentNode.removeChild(resultModal);
                }
                document.body.appendChild(resultModal);
                console.log("Result modal moved to body");
            }
            
            // ゲームのインスタンス生成
            window.game = new Game(settings);
            console.log("Game instance created");
            
            // リサイズイベントの設定
            window.addEventListener('resize', function() {
                if (window.game) {
                    // Android Chromeの場合は、リサイズ時にコンテナサイズも調整
                    if (isAndroid && isChrome) {
                        const isLandscape = window.innerWidth > window.innerHeight;
                        const windowWidth = window.innerWidth;
                        gameContainer.style.width = (windowWidth * 0.95) + 'px';
                        console.log("Container resized: " + gameContainer.style.width);
                    }
                    window.game.resizeCanvas();
                }
            });
            
        } catch (error) {
            console.error("ゲーム起動中にエラーが発生しました:", error);
            // エラーが発生した場合、設定画面を再表示
            const settingsPanel = document.querySelector('.settings-panel');
            if (settingsPanel) {
                settingsPanel.style.display = 'block';
            }
            alert("ゲームの起動に失敗しました。ページを再読み込みしてお試しください。");
        }
    }

    // スタートボタンのクリックイベント
    startButton.addEventListener('click', startGame);

    // スペースキーのイベントリスナーを追加
    window.addEventListener('keydown', (e) => {
        if (e.key === ' ' && settingsPanel.style.display !== 'none') {
            e.preventDefault(); // デフォルトのスクロール動作を防止
            startGame();
        }
    });

    // スタートボタンに説明を追加
    startButton.innerHTML = `
        ゲームスタート
        <span style="display: block; font-size: 0.7em; color: #4df; margin-top: 5px;">
            <i class="fas fa-keyboard"></i> スペースキーでもスタート
        </span>
    `;
};

// 設定値の変更を監視して難易度を更新
function updateDifficulty() {
    const settings = {
        maxEnemies: parseInt(document.getElementById('maxEnemies').value) || 10,
        enemySpeed: parseFloat(document.getElementById('enemySpeed').value) || 2,
        bulletSpeed: parseFloat(document.getElementById('bulletSpeed').value) || 5,
        bossStayTime: parseInt(document.getElementById('bossStayTime').value) || 10,
        playerLife: parseInt(document.getElementById('playerLife').value) || 3
    };

    const difficulty = calculateDifficultyLevel(settings);
    
    // 難易度表示を更新
    const difficultyElement = document.getElementById('difficultyLevel');
    if (difficultyElement) {
        difficultyElement.textContent = difficulty.level;
        
        // 難易度に応じて色を変更
        switch(difficulty.level) {
            case 'スーパーハード':
                difficultyElement.style.color = '#ff0000';
                break;
            case 'ハード':
                difficultyElement.style.color = '#ff6600';
                break;
            case '普通':
                difficultyElement.style.color = '#2196F3';
                break;
            case 'イージー':
                difficultyElement.style.color = '#00cc00';
                break;
            case 'スーパーイージー':
                difficultyElement.style.color = '#009900';
                break;
        }
    }
}

// 設定値の表示を更新
function updateSettingValue(id) {
    const input = document.getElementById(id);
    const valueSpan = document.getElementById(id + 'Value');
    if (input && valueSpan) {
        valueSpan.textContent = id === 'bossStayTime' ? input.value + '秒' : input.value;
    }
}

// 全ての設定項目にイベントリスナーを追加
window.addEventListener('DOMContentLoaded', function() {
    const settingIds = ['maxEnemies', 'enemySpeed', 'bulletSpeed', 'bossStayTime', 'playerLife'];
    
    settingIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // inputイベントとchangeイベントの両方をリッスン（タッチデバイス対応）
            input.addEventListener('input', () => {
                updateSettingValue(id);
                updateDifficulty();
            });
            input.addEventListener('change', () => {
                updateSettingValue(id);
                updateDifficulty();
            });
            
            // タッチイベントもリッスン
            input.addEventListener('touchend', () => {
                updateSettingValue(id);
                updateDifficulty();
            });
            
            // 初期値を設定
            updateSettingValue(id);
        }
    });
    
    // 初期難易度を表示
    updateDifficulty();

    // タッチ操作の説明表示・非表示の切り替え
    const touchControlsInfo = document.getElementById('touchControlsInfo');
    if (touchControlsInfo) {
        touchControlsInfo.style.display = isMobileDevice() ? 'block' : 'none';
    }
    
    // 横向き推奨メッセージの表示・非表示を設定
    const orientationMessage = document.getElementById('orientationMessage');
    if (orientationMessage) {
        if (isMobileDevice()) {
            // モバイルデバイスの場合はクラスを追加（縦向き時のみ表示）
            orientationMessage.classList.add('mobile-only');
        } else {
            // PCの場合は完全に非表示
            orientationMessage.style.display = 'none';
        }
    }
    
    // モバイルデバイスの場合、スライダーのタッチイベント処理を強化
    if (isMobileDevice()) {
        const sliders = document.querySelectorAll('input[type="range"][data-setting="true"]');
        sliders.forEach(slider => {
            // つまみがタッチしやすいようにスタイル調整
            slider.style.cursor = 'pointer';
            
            // タッチ操作時の設定更新処理を強化
            slider.addEventListener('touchmove', function() {
                const id = this.id;
                const valueSpan = document.getElementById(id + 'Value');
                if (valueSpan) {
                    valueSpan.textContent = id === 'bossStayTime' ? this.value + '秒' : this.value;
                }
                // 難易度も動的に更新
                updateDifficulty();
            });
            
            // タッチ操作のフィードバックを改善
            slider.addEventListener('touchstart', function() {
                this.classList.add('touching');
            });
            
            slider.addEventListener('touchend', function() {
                this.classList.remove('touching');
                updateSettingValue(this.id);
                updateDifficulty();
            });
        });
    }
}); 