// スクロールアニメーション
document.addEventListener('DOMContentLoaded', () => {
    // 要素のフェードイン
    const fadeInElements = document.querySelectorAll('.world-content, .keyword-item, .character-item, .prologue-content, .gallery-grid, .release-content');
    
    const fadeInOnScroll = () => {
        fadeInElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            
            if (elementTop < window.innerHeight && elementBottom > 0) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // 初期スタイルの設定
    fadeInElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    });

    // スクロールイベントの監視
    window.addEventListener('scroll', fadeInOnScroll);
    fadeInOnScroll(); // 初期表示時にも実行

    // ギャラリー画像のモーダル表示
    const galleryImages = document.querySelectorAll('.gallery-grid img');
    let currentImageIndex = 0;

    // モーダル要素の作成
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <img src="" alt="ギャラリー画像">
            <button class="prev">&lt;</button>
            <button class="next">&gt;</button>
        </div>
    `;
    document.body.appendChild(modal);

    // モーダルスタイルの追加
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 1000;
        }
        .modal-content {
            position: relative;
            max-width: 90%;
            max-height: 90vh;
            margin: 2rem auto;
        }
        .modal-content img {
            width: 100%;
            height: auto;
            max-height: 90vh;
            object-fit: contain;
        }
        .close {
            position: absolute;
            top: -2rem;
            right: 0;
            color: white;
            font-size: 2rem;
            cursor: pointer;
        }
        .prev, .next {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            padding: 1rem;
            cursor: pointer;
            font-size: 1.5rem;
        }
        .prev { left: 1rem; }
        .next { right: 1rem; }
    `;
    document.head.appendChild(style);

    // ギャラリー画像のクリックイベント
    galleryImages.forEach((img, index) => {
        img.addEventListener('click', () => {
            currentImageIndex = index;
            const modalImg = modal.querySelector('img');
            modalImg.src = img.src;
            modal.style.display = 'block';
        });
    });

    // モーダルを閉じる
    modal.querySelector('.close').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 前後の画像に移動
    modal.querySelector('.prev').addEventListener('click', () => {
        currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
        modal.querySelector('img').src = galleryImages[currentImageIndex].src;
    });

    modal.querySelector('.next').addEventListener('click', () => {
        currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
        modal.querySelector('img').src = galleryImages[currentImageIndex].src;
    });

    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // キーボード操作
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'block') {
            if (e.key === 'ArrowLeft') {
                currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
                modal.querySelector('img').src = galleryImages[currentImageIndex].src;
            } else if (e.key === 'ArrowRight') {
                currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                modal.querySelector('img').src = galleryImages[currentImageIndex].src;
            } else if (e.key === 'Escape') {
                modal.style.display = 'none';
            }
        }
    });
}); 