// 100% Full-Screen Dynamic Viewport Handler (Tilda Zero Block equivalent)
function updateAppDimensions() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    document.documentElement.style.setProperty('--app-height', vh + 'px');
    document.documentElement.style.setProperty('--app-width', vw + 'px');

    // Compute responsive scale for the Rules modal stage so it never overflows
    // Reference stage: 360px wide by 650px high
    const safeH = Math.max(300, vh - 20);
    const safeW = Math.max(280, vw - 16);
    const scale = Math.min(1.0, safeW / 360, safeH / 650);
    document.documentElement.style.setProperty('--rules-scale', scale.toFixed(3));
}
window.addEventListener('resize', updateAppDimensions);
window.addEventListener('orientationchange', () => setTimeout(updateAppDimensions, 100));
window.addEventListener('pageshow', updateAppDimensions);
updateAppDimensions();

/**



 * LB Group New Year Game — Полет Деда Мороза на воке



 * Pixel-perfect implementation from Figma design specs.



 * Node: 1107:8 (HUD Header), 3008:237 (Cover), 1493:3076 (Rules), 1496:11669 (End screen),



 *       1496:10346 (Obstacles 1:1 scale), 3005:3153 (Authentic Snowflakes)



 */







const GAME_CONFIG = {
    width: 390,
    height: 844,
    gravity: 0.36,
    thrust: -0.65,          // Continuous lift while holding
    tapImpulse: -5.8,       // Agile jump impulse per tap
    maxSpeedY: 8.0,
    baseScrollSpeed: 4.85,  // Exact initial speed matching LB_Game_18_12_2 (speedScroll=9 @ 60fps = 0.75 screen/s)
    targetScore: 500
};








const RULES_DATA = [
    { src: 'assets/rules_card_1.webp', alt: 'Правило 1: Время взлетать!' },
    { src: 'assets/rules_card_2.webp', alt: 'Правило 2: Собирайте блюда' },
    { src: 'assets/rules_card_3.webp', alt: 'Правило 3: Острые ощущения ×2' },
    { src: 'assets/rules_card_4.webp', alt: 'Правило 4: Зимой в небе тесно' },
    { src: 'assets/rules_card_5.webp', alt: 'Правило 5: Сердца не железные' },
    { src: 'assets/rules_card_6.webp', alt: 'Правило 6: Запах победы' }
];

class Game {




    constructor() {



        this.canvas = document.getElementById('gameCanvas');



        this.ctx = this.canvas.getContext('2d');







        this.snowCanvas = document.getElementById('snowCanvas');



        this.snowCtx = this.snowCanvas.getContext('2d');







        this.scaleCanvas();



        window.addEventListener('resize', () => {



            this.scaleCanvas();



        });







        // State: 'START' | 'RULES' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'ENDED'
        this.state = 'START';

        // Gameplay state
        this.score = 0;
        this.hearts = 3;
        this.targetScore = GAME_CONFIG.targetScore;

        // Rules slider DOM & state (1:1 из игра 3 в ряд)
        this.currentRuleIndex = 0;
        this.totalRules = RULES_DATA.length;
        this.rulesCardSlot = document.getElementById('rulesCardSlot');
        this.rulesPagination = document.getElementById('rulesPagination');
        this.dualButtonsGroup = document.getElementById('dualButtonsGroup');
        this.singleStartGroup = document.getElementById('singleStartGroup');
        this.rulesNextBtn = document.getElementById('rulesNextBtn');
        this.rulesSkipBtn = document.getElementById('rulesSkipBtn');
        this.rulesStartBtn = document.getElementById('rulesStartBtn');

        this.bgScrollX = 0;

        // Attempts & best score tracking (1:1 как в игра_ловля)
        this.maxAttempts = 3;
        this.attemptsUsed = 0;
        this.bestScore = 0;







        // Player (Santa in ramen wok balloon from Figma — +10% larger)



        this.player = {



            x: 50,



            y: 330,



            width: 154,



            height: 187,



            vy: 0,



            rotation: 0,



            isThrusting: false,



            invulnerableTimer: 0



        };







        // Entities



        this.obstacles = [];



        this.collectibles = [];



        this.particles = [];



        this.floatingTexts = [];



        this.confetti = [];







        // Timers & modifiers



        this.spawnTimer = 0;



        this.screenShake = 0;



        this.lastTime = performance.now();







        // Assets



        this.images = {};



        this.snowflakeSprites = [];



        this.loadAssets();







        // Initialize authentic Figma snowflakes



        this.initSnowflakes();







        // Event bindings



        this.bindEvents();







        // Start loops



        this.snowLoop = this.snowLoop.bind(this);



        requestAnimationFrame(this.snowLoop);







        this.gameLoop = this.gameLoop.bind(this);



        requestAnimationFrame(this.gameLoop);



    }







    scaleCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const container = document.getElementById('gameContainer') || document.body;
        const rect = container.getBoundingClientRect();

        const baseWidth = 390;
        const scale = (rect.width > 0 ? rect.width : baseWidth) / baseWidth;
        if (rect.height > 0) {
            GAME_CONFIG.height = Math.round(rect.height / scale);
        }

        [this.canvas, this.snowCanvas].forEach(cnv => {
            if (!cnv) return;
            cnv.width = Math.round((rect.width > 0 ? rect.width : baseWidth) * dpr);
            cnv.height = Math.round((rect.height > 0 ? rect.height : (GAME_CONFIG.height * scale)) * dpr);
            const ctx = cnv.getContext('2d');
            ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
        });
    }







        loadAssets() {
        this.assetsLoaded = false;
        this.preloadedImageList = [];

        const assetMap = {
            bgGame: 'assets/game_bg_clean.webp',
            santa: 'assets/santa.webp',
            coinLB: 'assets/coin_lb.webp',
            heart: 'assets/heart.webp',

            // Upper obstacles:
            forkPasta: 'assets/obstacle_fork_pasta.webp',
            icicleSnow: 'assets/obstacle_icicle_snow.webp',
            icicleClean: 'assets/obstacle_icicle_clean.webp',
            chopsticksSushi: 'assets/obstacle_chopsticks_sushi.webp',

            // Lower obstacles:
            treeDecorated: 'assets/obstacle_tree_decorated.webp',
            treePine: 'assets/obstacle_tree_pine.webp',
            ramenLand: 'assets/obstacle_ramen_land.webp',
            snowman: 'assets/obstacle_snowman.webp',
            wushu: 'assets/obstacle_wushu.webp',
            jpan: 'assets/obstacle_jpan.webp',

            // Food & Coins:
            dango: 'assets/dango.webp',
            dimsumFlower: 'assets/food_dimsum_flower.webp',
            icecream: 'assets/food_icecream.webp',
            ramen: 'assets/food_ramen.webp',
            onigiri: 'assets/food_onigiri.webp',
            bao: 'assets/food_bao.webp',
            pikachu: 'assets/food_pikachu.webp'
        };

        const imagePromises = [];

        // Safe loader with 2.5s timeout so mobile never hangs
        const safeLoad = (img, src, timeoutMs = 2500) => {
            return new Promise(resolve => {
                let settled = false;
                const finish = () => {
                    if (!settled) {
                        settled = true;
                        resolve();
                    }
                };
                img.onload = finish;
                img.onerror = finish;
                setTimeout(finish, timeoutMs);
                img.src = src;
            });
        };

        for (const [key, path] of Object.entries(assetMap)) {
            const img = new Image();
            this.preloadedImageList.push(img); // keep reference against GC
            imagePromises.push(safeLoad(img, path));
            this.images[key] = img;
        }

        // Additional UI images
        const additionalImages = [
            'assets/count_3.webp',
            'assets/count_2.webp',
            'assets/count_1.webp',
            'assets/rules_fir_tree.webp',
            'assets/result_title_banner.webp',
            'assets/result_plate_card.webp',
            'assets/result_coin.webp',
            'assets/result_btn_claim.webp',
            'assets/result_btn_retry.webp',
            'assets/final_screen_bg.webp',
            'assets/final_title_banner.webp',
            'assets/final_santa_balloon.webp',
            'assets/final_btn_exit.webp'
        ];
        additionalImages.forEach(path => {
            const img = new Image();
            this.preloadedImageList.push(img);
            imagePromises.push(safeLoad(img, path));
        });

        // 22 snowflake sprites (loaded progressively, do not block game start)
        for (let i = 0; i < 22; i++) {
            const flakeImg = new Image();
            this.preloadedImageList.push(flakeImg);
            flakeImg.src = `assets/snowflakes/flake_${i}.webp`;
            this.snowflakeSprites.push(flakeImg);
        }

        this.assetsPromise = Promise.all(imagePromises).then(() => {
            this.assetsLoaded = true;
            console.log('All core game assets preloaded and ready!');
        });

        // Absolute guarantee fallback: after 2.5s maximum, always mark assets ready
        setTimeout(() => {
            if (!this.assetsLoaded) {
                this.assetsLoaded = true;
                console.log('Asset preloading fallback ready');
            }
        }, 2500);
    }

    initSnowflakes() {



        this.snowflakes = [];



        const count = 35;



        for (let i = 0; i < count; i++) {



            this.snowflakes.push({



                x: Math.random() * GAME_CONFIG.width,



                y: Math.random() * GAME_CONFIG.height,



                spriteIndex: Math.floor(Math.random() * 22),



                scale: Math.random() * 0.35 + 0.35,



                speedY: Math.random() * 1.4 + 0.8,



                speedX: (Math.random() - 0.5) * 0.5,



                rotation: Math.random() * Math.PI * 2,



                rotSpeed: (Math.random() - 0.5) * 0.02,



                swaySpeed: Math.random() * 0.025 + 0.015,



                swayAmp: Math.random() * 1.2 + 0.4,



                phase: Math.random() * Math.PI * 2,



                opacity: Math.random() * 0.45 + 0.55



            });



        }



    }







    bindEvents() {



        const attachButton = (id, callback) => {



            const btn = document.getElementById(id);



            if (!btn) return;







            let handled = false;



            const trigger = (e) => {



                if (handled) return;



                handled = true;



                setTimeout(() => { handled = false; }, 250);



                e.preventDefault();



                e.stopPropagation();



                callback();



            };







            btn.addEventListener('click', trigger);



            btn.addEventListener('touchend', trigger);



        };







        // 1. Play Button on Cover (01-cover) -> Transitions to Rules



        attachButton('playBtn', () => {



            this.showRulesScreen();



        });







        // 2. Rules Slider Buttons (1:1 из игра 3 в ряд)
        if (this.rulesNextBtn) {
            this.rulesNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.currentRuleIndex < this.totalRules - 1) {
                    this.showRuleSlide(this.currentRuleIndex + 1);
                }
            });
        }

        if (this.rulesSkipBtn) {
            this.rulesSkipBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startCountdown();
            });
        }

        if (this.rulesStartBtn) {
            this.rulesStartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startCountdown();
            });
        }

        // Click on dots (1:1 из игра 3 в ряд)
        if (this.rulesPagination) {
            const dots = this.rulesPagination.querySelectorAll('.pagination-dot');
            dots.forEach((dot, idx) => {
                dot.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showRuleSlide(idx);
                });
            });
        }

        // Swipe support on rules card slot (1:1 из игра 3 в ряд)
        if (this.rulesCardSlot) {
            let touchRulesX = 0;
            this.rulesCardSlot.addEventListener('touchstart', (e) => {
                touchRulesX = e.touches[0].clientX;
            }, { passive: true });

            this.rulesCardSlot.addEventListener('touchend', (e) => {
                const diffX = touchRulesX - e.changedTouches[0].clientX;
                if (Math.abs(diffX) > 40) {
                    if (diffX > 0 && this.currentRuleIndex < this.totalRules - 1) {
                        this.showRuleSlide(this.currentRuleIndex + 1);
                    } else if (diffX < 0 && this.currentRuleIndex > 0) {
                        this.showRuleSlide(this.currentRuleIndex - 1);
                    }
                }
            }, { passive: true });
        }

        // 3. Pause button on HUD
        attachButton('pauseBtn', () => {



            this.togglePause();



        });







        // 4. Resume button in Pause Modal



        attachButton('resumeBtn', () => {



            this.resumeGame();



        });







        // 5. Button "ЗАБРАТЬ БОНУСЫ" on Result Screen -> переход на финальный экран "СПАСИБО ЗА ВИЗИТ!"
        attachButton('btnClaimBonus', () => {
            document.getElementById('resultScreen')?.classList.add('hidden');
            document.getElementById('finalScreen')?.classList.remove('hidden');
        });

        // 6. Button "ПОПРОБОВАТЬ ЕЩЕ РАЗ" on Result Screen (1:1 как в игра_ловля)
        attachButton('btnRetryGame', () => {
            if (this.attemptsUsed >= this.maxAttempts) return;
            document.getElementById('resultScreen')?.classList.add('hidden');
            this.startCountdown();
        });

        // 7. Button "ВЫЙТИ" on Final Screen (1:1 как в игра_ловля)
        attachButton('btnFinalExit', () => {
            // 1. Попытка закрыть в Telegram WebApp
            if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.close === 'function') {
                window.Telegram.WebApp.close();
                return;
            }

            // 2. Попытка закрыть окно / вкладку браузера
            window.close();

            // 3. Сообщение о завершении, если браузер блокирует прямой вызов window.close()
            setTimeout(() => {
                const plateContent = document.querySelector('.final-plate-content');
                if (plateContent) {
                    plateContent.innerHTML = `
                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:10px;">
                            <h2 style="font-family:'Suisse Intl',Rubik,sans-serif;font-weight:700;color:#0b4d96;font-size:20px;margin-bottom:8px;">Игра завершена!</h2>
                            <p style="font-family:'Suisse Intl',Rubik,sans-serif;color:#335d8a;font-size:13.5px;line-height:1.4;margin:0;">Спасибо за участие в новогодней игре.<br>Вы можете безопасно закрыть эту страницу.</p>
                        </div>
                    `;
                }
            }, 250);
        });







        // Flight controls on game canvas & container:



        const startThrust = (e) => {



            if (this.state !== 'PLAYING') return;







            this.player.vy = GAME_CONFIG.tapImpulse;



            this.player.isThrusting = true;







            // Small steam/snow puff particles behind wok



            for (let i = 0; i < 3; i++) {



                this.particles.push({



                    x: this.player.x + 38,



                    y: this.player.y + this.player.height - 20,



                    vx: -Math.random() * 3 - 2,



                    vy: (Math.random() - 0.5) * 2,



                    color: 'rgba(255, 255, 255, 0.75)',



                    radius: Math.random() * 3 + 1.5,



                    life: 0.25,



                    maxLife: 0.25



                });



            }



        };







        const stopThrust = () => {



            if (this.state === 'PLAYING') {



                this.player.isThrusting = false;



            }



        };







        this.canvas.addEventListener('mousedown', startThrust);



        this.canvas.addEventListener('touchstart', (e) => {



            if (this.state === 'PLAYING') {



                e.preventDefault();



                startThrust(e);



            }



        }, { passive: false });







        window.addEventListener('mouseup', stopThrust);



        window.addEventListener('touchend', stopThrust);



        window.addEventListener('touchcancel', stopThrust);







        window.addEventListener('keydown', (e) => {



            if (e.code === 'Space' || e.code === 'ArrowUp') {



                if (this.state === 'PLAYING' && !this.player.isThrusting) {



                    e.preventDefault();



                    startThrust(e);



                }



            } else if (e.code === 'KeyP') {



                if (this.state === 'PLAYING') this.togglePause();



                else if (this.state === 'PAUSED') this.resumeGame();



            }



        });







        window.addEventListener('keyup', (e) => {



            if (e.code === 'Space' || e.code === 'ArrowUp') {



                if (this.state === 'PLAYING') {



                    stopThrust();



                }



            }



        });



    }







    showRulesScreen() {
        this.state = 'RULES';
        document.getElementById('startScreen')?.classList.add('hidden');
        document.getElementById('rulesScreen')?.classList.remove('hidden');
        this.showRuleSlide(0);
    }

    showRuleSlide(index) {
        if (index < 0 || index >= this.totalRules) return;
        this.currentRuleIndex = index;
        const data = RULES_DATA[index];

        if (!this.rulesCardSlot) {
            this.rulesCardSlot = document.getElementById('rulesCardSlot');
        }
        if (this.rulesCardSlot) {
            const existingImg = this.rulesCardSlot.querySelector('.rules-card-img');
            if (!existingImg || existingImg.getAttribute('src') !== data.src) {
                this.rulesCardSlot.innerHTML = `<img src="${data.src}" class="rules-card-img" alt="${data.alt}">`;
            }
        }

        // Update pagination dots (1:1 из игра 3 в ряд)
        if (!this.rulesPagination) {
            this.rulesPagination = document.getElementById('rulesPagination');
        }
        if (this.rulesPagination) {
            const dots = this.rulesPagination.querySelectorAll('.pagination-dot');
            dots.forEach((dot, i) => {
                if (i === index) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        }

        // Toggle buttons (Next+Skip on slides 0..totalRules-2, Start on last slide totalRules-1)
        if (!this.dualButtonsGroup) this.dualButtonsGroup = document.getElementById('dualButtonsGroup');
        if (!this.singleStartGroup) this.singleStartGroup = document.getElementById('singleStartGroup');

        if (index === this.totalRules - 1) {
            if (this.dualButtonsGroup) this.dualButtonsGroup.classList.add('hidden');
            if (this.singleStartGroup) this.singleStartGroup.classList.remove('hidden');
        } else {
            if (this.dualButtonsGroup) this.dualButtonsGroup.classList.remove('hidden');
            if (this.singleStartGroup) this.singleStartGroup.classList.add('hidden');
        }
    }







    togglePause() {



        if (this.state === 'PLAYING') {



            this.state = 'PAUSED';



            document.getElementById('pauseModal').classList.remove('hidden');



        }



    }







    resumeGame() {



        if (this.state === 'PAUSED') {



            this.state = 'PLAYING';



            document.getElementById('pauseModal').classList.add('hidden');



            this.lastTime = performance.now();



        }



    }







    resetGameplayState() {
        if (this.countdownTimers) {
            this.countdownTimers.forEach(clearTimeout);
        }
        this.countdownTimers = [];

        this.screenShake = 0;
        this.score = 0;
        // 1 сердце = 1 попытка: сердца на экране отражают оставшиеся попытки (3 -> 2 -> 1)
        this.hearts = Math.max(0, this.maxAttempts - this.attemptsUsed);
        this.bgScrollX = 0;

        // Clear previous entities & effects
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.confetti = [];
        this.spawnTimer = 0;
        this.foodIndex = 0;

        // Santa starting position safe vertical calculation
        const safeStartY = Math.min(464, Math.max(50, Math.round((GAME_CONFIG.height - (this.player?.height || 180)) * 0.45)));
        if (this.player) {
            this.player.x = 50;
            this.player.y = safeStartY;
            this.player.vy = 0;
            this.player.rotation = 0;
            this.player.invulnerableTimer = 0;
            this.player.isThrusting = false;
        }

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        }

        this.updateHUD();
    }

    startCountdown() {
        this.lastTime = performance.now();
        this.state = 'COUNTDOWN';

        // Полная очистка всех стейтов перед началом игры (1:1 как в игра_ловля)
        this.resetGameplayState();

        document.getElementById('rulesScreen')?.classList.add('hidden');
        document.getElementById('resultScreen')?.classList.add('hidden');
        document.getElementById('finalScreen')?.classList.add('hidden');
        document.getElementById('victoryScreen')?.classList.add('hidden');
        document.getElementById('gameCanvas')?.classList.remove('hidden');
        document.getElementById('snowCanvas')?.classList.remove('hidden');

        document.getElementById('hud')?.classList.remove('hidden');
        this.updateHUD();

        const overlay = document.getElementById('countdownOverlay');
        const c3 = document.getElementById('cnt3');
        const c2 = document.getElementById('cnt2');
        const c1 = document.getElementById('cnt1');
        overlay?.classList.remove('hidden');

        [c3, c2, c1].forEach(el => {
            if (el) {
                el.classList.remove('active');
                void el.offsetWidth; // Force CSS animation reflow
            }
        });

        if (this.countdownTimers) {
            this.countdownTimers.forEach(clearTimeout);
        }
        this.countdownTimers = [];

        // Step 3 immediately
        if (c3) {
            void c3.offsetWidth;
            c3.classList.add('active');
        }

        // Step 2 at 950ms
        this.countdownTimers.push(setTimeout(() => {
            if (this.state !== 'COUNTDOWN') return;
            if (c3) c3.classList.remove('active');
            if (c2) {
                void c2.offsetWidth;
                c2.classList.add('active');
            }
        }, 950));

        // Step 1 at 1900ms
        this.countdownTimers.push(setTimeout(() => {
            if (this.state !== 'COUNTDOWN') return;
            if (c2) c2.classList.remove('active');
            if (c1) {
                void c1.offsetWidth;
                c1.classList.add('active');
            }
        }, 1900));

        // Start Gameplay at 2850ms
        this.countdownTimers.push(setTimeout(() => {
            if (this.state !== 'COUNTDOWN') return;
            if (c1) c1.classList.remove('active');
            overlay?.classList.add('hidden');
            this.startGameplay();
        }, 2850));
    }

    startGameplay() {
        this.lastTime = performance.now();
        this.state = 'PLAYING';
        if (this.player) {
            this.player.invulnerableTimer = 0;
        }

        // Immediately spawn first obstacle wave outside screen — no empty screens at track start!
        this.spawnWave();
        this.spawnTimer = 0;
    }







    restartGame() {



        document.getElementById('victoryScreen').classList.add('hidden');
        document.getElementById('bgRules')?.classList.remove('active');



        this.startCountdown();



    }







    updateHUD() {



        // 1. Hearts from Figma



        const heartsContainer = document.getElementById('heartsContainer');



        if (heartsContainer) {



            const heartImgs = heartsContainer.querySelectorAll('.hud-heart');



            heartImgs.forEach((img, idx) => {



                if (idx < this.hearts) {



                    img.classList.remove('lost');



                    img.classList.add('active');



                } else {



                    img.classList.remove('active');



                    img.classList.add('lost');



                }



            });



        }







        // 2. Score Badge: БАЛЛЫ: X / 300



        const scoreBadge = document.getElementById('scoreBadge');



        if (scoreBadge) {



            scoreBadge.textContent = `БАЛЛЫ: ${this.score} / ${this.targetScore}`;



        }







        // 3. Full-width progress track with LB Coin slider



        const progressCoin = document.getElementById('progressCoin');



        const progressFill = document.getElementById('progressFill');



        if (progressCoin && progressFill) {



            const progress = Math.min(1.0, this.score / this.targetScore);



            const pct = Math.round(progress * 100);



            progressCoin.style.left = `${pct}%`;



            progressFill.style.width = `${pct}%`;



        }



    }







    // Result Screen (1:1 как в игра_ловля)
    triggerEndGame() {
        if (this.state === 'ENDED') return;
        const finalScore = this.score;
        this.state = 'ENDED';

        if (this.countdownTimers) {
            this.countdownTimers.forEach(clearTimeout);
        }
        this.countdownTimers = [];

        this.attemptsUsed++;
        this.bestScore = Math.max(this.bestScore, finalScore);
        const attemptsLeft = Math.max(0, this.maxAttempts - this.attemptsUsed);

        // Полная очистка всех геймплейных стейтов (тряска экрана, Santa, объекты) 1:1 как в игра_ловля
        this.resetGameplayState();

        document.getElementById('startScreen')?.classList.add('hidden');
        document.getElementById('rulesScreen')?.classList.add('hidden');
        document.getElementById('countdownOverlay')?.classList.add('hidden');
        document.getElementById('hud')?.classList.add('hidden');
        document.getElementById('pauseModal')?.classList.add('hidden');
        document.getElementById('finalScreen')?.classList.add('hidden');

        // Dynamic result screen values (1:1 как в игра_ловля)
        const scoreVal = document.getElementById('resultScoreValue');
        if (scoreVal) {
            scoreVal.textContent = `+${finalScore}`;
        }

        const attemptsText = document.getElementById('resultAttemptsText');
        if (attemptsText) {
            attemptsText.textContent = `Осталось попыток: ${attemptsLeft}/${this.maxAttempts}`;
        }

        const bestScoreText = document.getElementById('resultBestScoreText');
        if (bestScoreText) {
            bestScoreText.textContent = `Ваш лучший результат: ${this.bestScore}`;
        }

        const btnRetry = document.getElementById('btnRetryGame');
        if (btnRetry) {
            if (attemptsLeft > 0) {
                btnRetry.classList.remove('hidden');
            } else {
                btnRetry.classList.add('hidden');
            }
        }

        // Show result screen
        document.getElementById('resultScreen')?.classList.remove('hidden');







        // Confetti celebration



        this.confetti = [];



        const colors = ['#ffd166', '#ff4757', '#06d6a0', '#118ab2', '#ffffff'];



        for (let i = 0; i < 80; i++) {



            this.confetti.push({



                x: Math.random() * GAME_CONFIG.width,



                y: Math.random() * -200,



                vx: (Math.random() - 0.5) * 4,



                vy: Math.random() * 4 + 2,



                color: colors[Math.floor(Math.random() * colors.length)],



                size: Math.random() * 8 + 4,



                rotation: Math.random() * 360,



                rotSpeed: (Math.random() - 0.5) * 8



            });



        }



    }







    // Snow Loop runs continuously with authentic Figma snowflakes from frame 3005:3153



    snowLoop() {



        const ctx = this.snowCtx;



        ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);







        const now = performance.now();



        this.snowflakes.forEach(s => {



            s.y += s.speedY;



            s.x += s.speedX + Math.sin(now * s.swaySpeed + s.phase) * s.swayAmp;



            s.rotation += s.rotSpeed;







            if (s.y > GAME_CONFIG.height + 30) {



                s.y = -30;



                s.x = Math.random() * GAME_CONFIG.width;



            }



            if (s.x < -30) s.x = GAME_CONFIG.width + 30;



            if (s.x > GAME_CONFIG.width + 30) s.x = -30;







            // Only draw on snowCanvas when not in active live gameplay



            // (During PLAYING, gameplay canvas draws snow directly between background and hero/obstacles)



            if (this.state !== 'PLAYING') {



                const sprite = this.snowflakeSprites[s.spriteIndex];



                if (sprite && sprite.complete && sprite.naturalWidth > 0) {



                    ctx.save();



                    ctx.translate(s.x, s.y);



                    ctx.rotate(s.rotation);



                    ctx.globalAlpha = s.opacity;



                    const w = sprite.naturalWidth * s.scale;



                    const h = sprite.naturalHeight * s.scale;



                    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);



                    ctx.restore();



                }



            }



        });







        requestAnimationFrame(this.snowLoop);



    }







    gameLoop(timestamp) {



        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);



        this.lastTime = timestamp;







        if (this.state === 'PLAYING') {
            this.update(dt);
        } else if (this.state === 'DYING') {
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
        } else if (this.state === 'ENDED') {
            this.updateConfetti(dt);
        }

        // Guaranteed decay of residual screen shake across any state transition
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * 4.0);
        }

        this.render();



        requestAnimationFrame(this.gameLoop);



    }







    update(dt) {



        // Dynamic speed & obstacle progression (increases with score 0 -> 300)

        const progressRatio = Math.min(1.0, this.score / this.targetScore);

        const currentSpeed = GAME_CONFIG.baseScrollSpeed + progressRatio * 1.8;



        // Scroll background

        this.bgScrollX += currentSpeed * 25 * dt;







        // 1. Player Physics



        if (this.player.isThrusting) {



            this.player.vy += GAME_CONFIG.thrust;



        } else {



            this.player.vy += GAME_CONFIG.gravity;



        }



        this.player.vy = Math.max(-GAME_CONFIG.maxSpeedY, Math.min(GAME_CONFIG.maxSpeedY, this.player.vy));



        this.player.y += this.player.vy;







        // Dynamic tilt angle



        this.player.rotation = this.player.vy * 0.035;







        // Boundaries collision: hitting ceiling or ground takes 1 heart



        const minY = 5;



        const maxY = GAME_CONFIG.height - this.player.height - 5;



        if (this.player.y <= minY) {



            this.player.y = minY;



            this.player.vy = 2.5; // Bounce down softly



            if (this.player.invulnerableTimer <= 0) {



                this.takeDamage();



            }



        } else if (this.player.y >= maxY) {



            this.player.y = maxY;



            this.player.vy = -3.5; // Bounce up softly



            if (this.player.invulnerableTimer <= 0) {



                this.takeDamage();



            }



        }







        if (this.player.invulnerableTimer > 0) {



            this.player.invulnerableTimer -= dt;



        }







        if (this.screenShake > 0) {



            this.screenShake = Math.max(0, this.screenShake - dt * 2.5);



        }







        // 2. Obstacles Spawning: interval decreases as score rises (density increases!)

        this.spawnTimer += dt;

        const spawnInterval = Math.max(1.2, 2.0 - progressRatio * 0.75);

        if (this.spawnTimer >= spawnInterval) {

            this.spawnTimer = 0;

            this.spawnWave();

        }



        // Move obstacles with dynamic speed

        for (let i = this.obstacles.length - 1; i >= 0; i--) {

            const obs = this.obstacles[i];

            obs.x -= currentSpeed * 60 * dt;







            // Hit test with player — strictly guard: obstacle image MUST be loaded and visible
            const obsImg = this.images[obs.type];
            const isObsVisible = obsImg && obsImg.complete && obsImg.naturalWidth > 0;
            if (isObsVisible && this.player.invulnerableTimer <= 0 && this.checkCollision(this.player, obs)) {
                this.takeDamage();
            }







            if (obs.x + obs.width < -100) {



                this.obstacles.splice(i, 1);



            }



        }







        // Move collectibles



        for (let i = this.collectibles.length - 1; i >= 0; i--) {



            const col = this.collectibles[i];



            col.x -= currentSpeed * 60 * dt;



            col.bobOffset += dt * 3.5;







            // Collect hit test



            if (this.checkCollision(this.player, col, 16)) {



                this.collectItem(col);



                this.collectibles.splice(i, 1);



                continue;



            }







            if (col.x + col.width < -80) {



                this.collectibles.splice(i, 1);



            }



        }







        this.updateParticles(dt);



        this.updateFloatingTexts(dt);



    }







    spawnWave() {
        if (!this.assetsLoaded) return;




        this.waveCount = (this.waveCount || 0) + 1;







        // Authentic Figma track sequence — obstacles scaled up to occupy ~1/3 of screen height (250-295px)



        // Authentic Figma track sequence — obstacles scaled up to occupy ~1/3 of screen height (280-320px)



        const trackPattern = [



            // 1. Lower: Tree Decorated



            { pos: 'lower', type: 'treeDecorated', width: 228, height: 320 },



            // 2. Upper: Icicle with Snow



            { pos: 'upper', type: 'icicleSnow', width: 235, height: 315 },



            // 3. Lower: Tree Pine



            { pos: 'lower', type: 'treePine', width: 230, height: 315 },



            // 4. Upper: Chopsticks with Sushi Roll



            { pos: 'upper', type: 'chopsticksSushi', width: 260, height: 305 },



            // 5. Lower: RAMEN LAND 4-story building



            { pos: 'lower', type: 'ramenLand', width: 298, height: 325 },



            // 6. Lower: Snowman with LB scarf



            { pos: 'lower', type: 'snowman', width: 245, height: 290 },



            // 7. Upper: Fork with Pasta and Shrimp



            { pos: 'upper', type: 'forkPasta', width: 240, height: 315 },



            // 8. Upper: Icicle Clean



            { pos: 'upper', type: 'icicleClean', width: 262, height: 305 },



            // 9. Lower: WU SHU restaurant



            { pos: 'lower', type: 'wushu', width: 450, height: 275 },



            // 10. Lower: Tree Decorated



            { pos: 'lower', type: 'treeDecorated', width: 228, height: 320 },



            // 11. Upper: Icicle with Snow



            { pos: 'upper', type: 'icicleSnow', width: 235, height: 315 },



            // 12. Lower: J'PAN restaurant with dog



            { pos: 'lower', type: 'jpan', width: 448, height: 275 },



            // 13. Lower: Snowman with LB scarf



            { pos: 'lower', type: 'snowman', width: 245, height: 290 },



            // 14. Upper: Fork with Pasta



            { pos: 'upper', type: 'forkPasta', width: 240, height: 315 },



            // 15. Lower: RAMEN LAND



            { pos: 'lower', type: 'ramenLand', width: 298, height: 325 },



            // 16. Upper: Icicle Clean



            { pos: 'upper', type: 'icicleClean', width: 262, height: 305 }



        ];







        const patternIndex = (this.waveCount - 1) % trackPattern.length;



        const chosen = trackPattern[patternIndex];







        if (chosen.pos === 'upper') {



            // Hanging flush from top ceiling (y = 0)



            this.obstacles.push({



                type: chosen.type,



                x: GAME_CONFIG.width + 30,



                y: 0,



                width: chosen.width,



                height: chosen.height,



                isUpper: true



            });



            // Food item placed in lower safe corridor (flight zone y: 480-520)



            this.spawnCollectibleItem(GAME_CONFIG.width + 60, 500);



        } else {



            // Sitting flush on bottom snow ground



            const obsY = GAME_CONFIG.height - chosen.height;



            this.obstacles.push({



                type: chosen.type,



                x: GAME_CONFIG.width + 30,



                y: obsY,



                width: chosen.width,



                height: chosen.height,



                isUpper: false



            });



            // Food item placed in upper safe corridor (flight zone y: 240-270)



            this.spawnCollectibleItem(GAME_CONFIG.width + 60, 255);



        }







// Trailing collectible removed to guarantee >= half-screen distance between prizes



    }







    spawnCollectibleItem(x, y) {



        // Enforce minimum distance >= half screen width (390 / 2 = 195px)



        const minDistance = 210;



        if (this.collectibles.length > 0) {



            const lastCol = this.collectibles[this.collectibles.length - 1];



            if (x - lastCol.x < minDistance) {



                x = lastCol.x + minDistance;



            }



        }







        // Authentic Collectible Food items in strict Figma track order:



        // 1. Dango -> 2. Flower Dim Sum -> 3. LB Coin -> 4. Ice Cream -> 5. Ramen -> 6. Onigiri -> 7. Bao



        const trackFoods = [
            { type: 'dango', width: 100, height: 94, points: 15 },
            { type: 'dimsumFlower', width: 100, height: 95, points: 15 },
            { type: 'coinLB', width: 90, height: 90, points: 15 },
            { type: 'pikachu', width: 96, height: 116, points: 15 },
            { type: 'icecream', width: 95, height: 103, points: 15 },
            { type: 'ramen', width: 104, height: 99, points: 15 },
            { type: 'onigiri', width: 106, height: 83, points: 15 },
            { type: 'bao', width: 100, height: 95, points: 15 }
        ];







        this.foodIndex = (this.foodIndex || 0) + 1;



        const chosen = trackFoods[(this.foodIndex - 1) % trackFoods.length];







        this.collectibles.push({



            type: chosen.type,



            x: x,



            y: Math.max(70, Math.min(GAME_CONFIG.height - chosen.height - 20, y)),



            width: chosen.width,



            height: chosen.height,



            points: chosen.points,



            bobOffset: Math.random() * Math.PI



        });



    }







    checkCollision(player, entity, padding = 34) {
        // Player hitbox: tighter inner core padding so balloon edges / hat tip don't trigger unfair hits
        const px = player.x + padding;
        const py = player.y + padding;
        const pw = player.width - padding * 2;
        const ph = player.height - padding * 2;

        let ex = entity.x;
        let ey = entity.y;
        let ew = entity.width;
        let eh = entity.height;

        if (entity.isUpper) {
            // Upper obstacle (icicles, fork, chopsticks hanging down from top):
            // Shrink obstacle hitbox to solid core:
            // Trim 24% off left and right sides (transparent PNG borders)
            ex += ew * 0.24;
            ew *= 0.52;
            // Trim 20% off bottom tip so flying near the tip is safe
            eh *= 0.80;
        } else if (entity.isUpper === false) {
            // Lower obstacle (trees, buildings, snowman on ground):
            // Trees and roof peaks taper upward with empty corners in the PNG rectangle:
            // Trim 24% off left and right sides
            ex += ew * 0.24;
            ew *= 0.52;
            // Trim 22% off top peak so flying over the obstacle doesn't hit empty air
            ey += eh * 0.22;
            eh *= 0.78;
        }

        return (
            px < ex + ew &&
            px + pw > ex &&
            py < ey + eh &&
            py + ph > ey
        );



    }







    takeDamage() {
        if (this.state !== 'PLAYING') return;
        this.state = 'DYING';

        // 1 столкновение сразу завершает попытку! (1 сердце = 1 попытка)
        this.hearts = Math.max(0, this.hearts - 1);
        this.player.invulnerableTimer = 2.0;
        this.screenShake = 0.45;
        this.updateHUD();

        // Sparkle burst on damage
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: '#ff4757',
                radius: Math.random() * 3 + 2,
                life: 0.5,
                maxLife: 0.5
            });
        }

        // Плавный переход на экран результатов с сохранением эффекта удара
        setTimeout(() => {
            this.triggerEndGame();
        }, 350);
    }







    collectItem(col) {
        // Фиксированно +15 баллов за каждый пойманный элемент, максимум 300 баллов
        const pts = 15;
        this.score = Math.min(this.targetScore, this.score + pts);

        const textColor = col.type === 'pikachu' ? '#ffe600' : '#ffd166';
        this.addFloatingText(`+${pts}`, col.x, col.y - 10, textColor);
        this.updateHUD();

        // Level ceiling reached (300 points) — finish attempt
        if (this.score >= this.targetScore) {
            setTimeout(() => {
                if (this.state === 'PLAYING') {
                    this.triggerEndGame();
                }
            }, 300);
        }

        // Particle stars
        const pCount = col.type === 'pikachu' ? 14 : 8;
        const pColor = col.type === 'pikachu' ? '#ffe600' : '#ffd166';
        for (let i = 0; i < pCount; i++) {
            this.particles.push({
                x: col.x + col.width / 2,
                y: col.y + col.height / 2,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
                color: pColor,
                radius: Math.random() * 3 + 1.5,



                life: 0.4,



                maxLife: 0.4



            });



        }







        this.updateHUD();



    }







    addFloatingText(text, x, y, color) {



        this.floatingTexts.push({



            text: text,



            x: x,



            y: y,



            color: color,



            alpha: 1.0,



            life: 0.8



        });



    }







    updateParticles(dt) {



        for (let i = this.particles.length - 1; i >= 0; i--) {



            const p = this.particles[i];



            p.x += p.vx * 60 * dt;



            p.y += p.vy * 60 * dt;



            p.life -= dt;



            if (p.life <= 0) this.particles.splice(i, 1);



        }



    }







    updateFloatingTexts(dt) {



        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {



            const ft = this.floatingTexts[i];



            ft.y -= 30 * dt;



            ft.life -= dt;



            ft.alpha = Math.max(0, ft.life / 0.8);



            if (ft.life <= 0) this.floatingTexts.splice(i, 1);



        }



    }







    updateConfetti(dt) {



        this.confetti.forEach(c => {



            c.x += c.vx;



            c.y += c.vy;



            c.vy += 0.35;



            c.rotation += c.rotSpeed;



        });



    }







    render() {



        const ctx = this.ctx;



        ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);







        // While on static screens, don't render gameplay objects



        if (this.state === 'START' || this.state === 'RULES') {
            return;
        }

        if (this.state === 'ENDED') {
            this.renderConfetti(ctx);
            return;
        }







        ctx.save();

        if ((this.state === 'PLAYING' || this.state === 'DYING') && this.screenShake > 0) {
            const dx = (Math.random() - 0.5) * this.screenShake * 16;
            const dy = (Math.random() - 0.5) * this.screenShake * 16;
            ctx.translate(dx, dy);
        }







        // 1. Draw Gameplay Background (Clean sky & snowy mountain landscape)



        this.renderBackground(ctx);







        // 2. Draw Dynamic Snowflakes on Game Canvas



        // Strictly BEHIND player Santa and obstacles!



        this.renderSnowOnGameCanvas(ctx);







        // Render first frame when in COUNTDOWN



        if (this.state === 'COUNTDOWN') {



            this.renderObstacles(ctx);



            this.renderPlayer(ctx);



            ctx.restore();



            return;



        }







        // 3. Active Gameplay Elements (Rendered in front of snow)



        this.renderObstacles(ctx);



        this.renderCollectibles(ctx);



        this.renderParticles(ctx);



        this.renderPlayer(ctx);



        this.renderFloatingTexts(ctx);







        if (this.state === 'ENDED') {



            this.renderConfetti(ctx);



        }







        ctx.restore();



    }







    renderBackground(ctx) {



        const img = this.images.bgGame;



        if (img && img.complete && img.naturalWidth > 0) {



            const h = GAME_CONFIG.height;



            const aspect = img.naturalWidth / img.naturalHeight;



            const w = h * aspect;







            let curX = -(this.bgScrollX % w);



            while (curX < GAME_CONFIG.width) {



                ctx.drawImage(img, curX, 0, w, h);



                curX += w;



            }



        }



    }







    renderSnowOnGameCanvas(ctx) {



        this.snowflakes.forEach(s => {



            const sprite = this.snowflakeSprites[s.spriteIndex];



            if (sprite && sprite.complete && sprite.naturalWidth > 0) {



                ctx.save();



                ctx.translate(s.x, s.y);



                ctx.rotate(s.rotation);



                ctx.globalAlpha = s.opacity;



                const w = sprite.naturalWidth * s.scale;



                const h = sprite.naturalHeight * s.scale;



                ctx.drawImage(sprite, -w / 2, -h / 2, w, h);



                ctx.restore();



            }



        });



    }







    renderObstacles(ctx) {



        this.obstacles.forEach(obs => {



            const img = this.images[obs.type];



            if (img && img.complete && img.naturalWidth > 0) {



                ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);



            }



        });



    }







    renderCollectibles(ctx) {



        this.collectibles.forEach(col => {



            ctx.save();



            const bobY = Math.sin(col.bobOffset) * 6;



            ctx.translate(col.x + col.width / 2, col.y + col.height / 2 + bobY);







            ctx.shadowColor = '#ffffff';



            ctx.shadowBlur = 8;







            const img = this.images[col.type];



            if (img && img.complete && img.naturalWidth > 0) {



                ctx.drawImage(img, -col.width / 2, -col.height / 2, col.width, col.height);



            }







            ctx.restore();



        });



    }







    renderPlayer(ctx) {



        ctx.save();



        ctx.translate(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);



        ctx.rotate(this.player.rotation);







        if (this.state === 'PLAYING' && this.player.invulnerableTimer > 0) {
            const flash = Math.floor(this.player.invulnerableTimer * 12) % 2 === 0;
            ctx.globalAlpha = flash ? 0.35 : 0.85;
        } else {
            ctx.globalAlpha = 1.0;
        }







        const img = this.images.santa;



        if (img && img.complete && img.naturalWidth > 0) {



            ctx.drawImage(img, -this.player.width / 2, -this.player.height / 2, this.player.width, this.player.height);



        }







        ctx.restore();



    }







    renderParticles(ctx) {



        this.particles.forEach(p => {



            ctx.save();



            ctx.globalAlpha = p.life / p.maxLife;



            ctx.fillStyle = p.color;



            ctx.beginPath();



            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);



            ctx.fill();



            ctx.restore();



        });



    }







    renderFloatingTexts(ctx) {



        this.floatingTexts.forEach(ft => {



            ctx.save();



            ctx.globalAlpha = ft.alpha;



            ctx.font = '900 italic 20px Rubik, sans-serif';



            ctx.fillStyle = ft.color;



            ctx.lineWidth = 3;



            ctx.strokeStyle = '#ffffff';



            ctx.strokeText(ft.text, ft.x, ft.y);



            ctx.fillText(ft.text, ft.x, ft.y);



            ctx.restore();



        });



    }







    renderConfetti(ctx) {



        this.confetti.forEach(c => {



            ctx.save();



            ctx.translate(c.x, c.y);



            ctx.rotate((c.rotation * Math.PI) / 180);



            ctx.fillStyle = c.color;



            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);



            ctx.restore();



        });



    }



}







window.addEventListener('DOMContentLoaded', () => {



    window.gameInstance = new Game();



});



