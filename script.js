/**
 * Abhishek Singh - Portfolio & Background Scroll Frame Animation
 * Target: 240 frames in /video_frames_24fps_jpg_quality95
 */

(() => {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 240;
  const FOLDER_PATH = 'video_frames_24fps_jpg_quality95';
  const LERP_FACTOR = 0.085; // Silky smooth damping factor

  // --- DOM Elements ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPercent = document.getElementById('loader-percent');
  const loaderCount = document.getElementById('loader-count');

  // --- State Variables ---
  const frames = new Array(TOTAL_FRAMES + 1); // 1-indexed (1 to 240)
  let loadedCount = 0;
  let isReady = false;

  let currentFrame = 1;
  let targetFrame = 1;
  let lastRenderedIndex = -1;
  let rafId = null;

  // Generate 6-digit zero-padded filename: frame_000001.jpg
  function getFrameUrl(index) {
    const padded = String(index).padStart(6, '0');
    return `${FOLDER_PATH}/frame_${padded}.jpg`;
  }

  // Set Canvas resolution adapted for Retina / High-DPI screens
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    const targetWidth = Math.round(displayWidth * dpr);
    const targetHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // High quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Force re-render of current active frame
    if (lastRenderedIndex > 0) {
      renderFrame(lastRenderedIndex);
    }
  }

  // Get closest available loaded frame to prevent any blank frames during fast scrubbing
  function getAvailableFrame(index) {
    if (frames[index] && frames[index].complete && frames[index].naturalWidth > 0) {
      return frames[index];
    }
    // Search nearby loaded frames
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = index - offset;
      if (prev >= 1 && frames[prev] && frames[prev].complete && frames[prev].naturalWidth > 0) {
        return frames[prev];
      }
      const next = index + offset;
      if (next <= TOTAL_FRAMES && frames[next] && frames[next].complete && frames[next].naturalWidth > 0) {
        return frames[next];
      }
    }
    return null;
  }

  // Draw image on canvas with 'object-fit: cover' logic
  function renderFrame(index) {
    const img = getAvailableFrame(index);
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Cover math (maintains aspect ratio, fills entire viewport centered)
    const hRatio = cw / iw;
    const vRatio = ch / ih;
    const ratio = Math.max(hRatio, vRatio);

    const dw = iw * ratio;
    const dh = ih * ratio;
    const dx = (cw - dw) * 0.5;
    const dy = (ch - dh) * 0.5;

    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // Calculate target frame index from scroll position
  function updateScrollTarget() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    const scrollFraction = maxScroll > 0 ? Math.max(0, Math.min(1, scrollY / maxScroll)) : 0;
    targetFrame = 1 + scrollFraction * (TOTAL_FRAMES - 1);
  }

  // Animation Loop: Linear interpolation (lerp) for inertia
  function animationLoop() {
    const diff = targetFrame - currentFrame;

    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    // Clamp current frame between 1 and TOTAL_FRAMES
    const frameToRender = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(currentFrame)));

    if (frameToRender !== lastRenderedIndex) {
      renderFrame(frameToRender);
      lastRenderedIndex = frameToRender;
    }

    rafId = requestAnimationFrame(animationLoop);
  }

  // Preload an individual image
  function preloadImage(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = getFrameUrl(index);

      const onLoad = () => {
        frames[index] = img;
        loadedCount++;
        onProgress();
        resolve(img);
      };

      const onError = () => {
        console.warn(`Failed to load frame ${index}`);
        loadedCount++;
        onProgress();
        resolve(null);
      };

      if (img.complete) {
        onLoad();
      } else {
        img.onload = onLoad;
        img.onerror = onError;
      }
    });
  }

  // Preload progress updater
  function onProgress() {
    const progress = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (loaderBar) loaderBar.style.width = `${progress}%`;
    if (loaderPercent) loaderPercent.textContent = `${progress}%`;
    if (loaderCount) loaderCount.textContent = `${loadedCount} / ${TOTAL_FRAMES}`;

    // Render frame 1 immediately once it is available
    if (loadedCount === 1 && frames[1]) {
      renderFrame(1);
      lastRenderedIndex = 1;
    }

    if (loadedCount >= TOTAL_FRAMES && !isReady) {
      isReady = true;
      setTimeout(() => {
        if (loader) loader.classList.add('loaded');
      }, 300);
    }
  }

  // Preload all frames efficiently with batching
  async function loadAllFrames() {
    // 1. Immediately load Frame 1 to give instant visual feedback
    await preloadImage(1);
    resizeCanvas();
    renderFrame(1);
    lastRenderedIndex = 1;

    // 2. Load remaining frames with a batching concurrency pool
    const CONCURRENCY = 12;
    const remainingIndices = [];
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      remainingIndices.push(i);
    }

    let nextQueueIdx = 0;
    async function worker() {
      while (nextQueueIdx < remainingIndices.length) {
        const idx = remainingIndices[nextQueueIdx++];
        await preloadImage(idx);
      }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
  }

  // Subtle scroll reveal animations
  function initScrollReveals() {
    const revealElements = document.querySelectorAll('.project-card, .panel-column, .contact-section');
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
      });
    }
  }

  // Initialize
  function init() {
    resizeCanvas();
    updateScrollTarget();

    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', updateScrollTarget, { passive: true });

    // Start render loop
    rafId = requestAnimationFrame(animationLoop);

    // Subtle reveals
    initScrollReveals();

    // Back to top smooth scroll
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Project Lightbox Modal
    initProjectModal();

    // Kick off image loading
    loadAllFrames();
  }

  // Project Lightbox Modal Implementation
  function initProjectModal() {
    const modal = document.getElementById('project-modal');
    if (!modal) return;

    const modalImg = document.getElementById('modal-img');
    const modalNum = document.getElementById('modal-num');
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');
    const closeBtn = document.getElementById('modal-close-btn');
    const backdrop = modal.querySelector('.modal-backdrop');
    const projectCards = document.querySelectorAll('.project-card');

    function openModal(card) {
      const img = card.querySelector('.project-preview img');
      const num = card.querySelector('.project-index');
      const title = card.querySelector('.project-title');
      const cat = card.querySelector('.project-type');

      if (img && modalImg) {
        modalImg.src = img.src;
        modalImg.alt = img.alt || 'Project Preview';
      }
      if (num && modalNum) modalNum.textContent = num.textContent;
      if (title && modalTitle) modalTitle.textContent = title.textContent;
      if (cat && modalCategory) modalCategory.textContent = cat.textContent;

      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (!modal.classList.contains('active') && modalImg) {
          modalImg.src = '';
        }
      }, 350);
    }

    projectCards.forEach(card => {
      const handleCardActivation = (e) => {
        const videoUrl = card.dataset.videoUrl || card.getAttribute('data-video-url') || card.getAttribute('href');
        if (videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://') || videoUrl.startsWith('//'))) {
          // Open external video link in a new tab directly
          e.preventDefault();
          e.stopPropagation();
          window.open(videoUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        e.preventDefault();
        openModal(card);
      };

      card.addEventListener('click', handleCardActivation);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardActivation(e);
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
