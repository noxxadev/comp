// ==========================================
// DASHBOARD INTERACTIONS - GLASS THEME
// ==========================================

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar on window resize if desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });
});

// Set current date
document.addEventListener('DOMContentLoaded', () => {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('id-ID', options);
    }
});

// Animate balance counter
document.addEventListener('DOMContentLoaded', () => {
    const balanceEl = document.querySelector('.balance-amount');
    if (balanceEl) {
        const target = parseFloat(balanceEl.getAttribute('data-target'));
        const duration = 1500;
        const start = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const current = target * easeProgress;
            balanceEl.textContent = current.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                balanceEl.textContent = target.toLocaleString('en-US');
            }
        }

        setTimeout(() => {
            requestAnimationFrame(updateCounter);
        }, 500);
    }
});

// Animate metric value counters
document.addEventListener('DOMContentLoaded', () => {
    const metricValues = document.querySelectorAll('.metric-value');

    metricValues.forEach((el, index) => {
        const target = parseFloat(el.getAttribute('data-target'));
        const duration = 1200;
        const delay = index * 150 + 300;

        setTimeout(() => {
            const start = performance.now();

            function updateCounter(currentTime) {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                const current = target * easeProgress;
                el.textContent = Math.floor(current).toLocaleString('en-US');

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                }
            }

            requestAnimationFrame(updateCounter);
        }, delay);
    });
});

// Draw chart line animation
document.addEventListener('DOMContentLoaded', () => {
    const chartLine = document.querySelector('.chart-line');
    if (chartLine) {
        const length = chartLine.getTotalLength();

        chartLine.style.strokeDasharray = length;
        chartLine.style.strokeDashoffset = length;
        chartLine.style.opacity = '1';

        setTimeout(() => {
            chartLine.style.transition = 'stroke-dashoffset 2s cubic-bezier(.16,1,.3,1)';
            chartLine.style.strokeDashoffset = '0';
        }, 800);
    }
});

// Staggered entrance animations for glass cards
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Re-observe elements that need stagger animation
    setTimeout(() => {
        const cards = document.querySelectorAll('.glass-card, .metric-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = `opacity 0.6s cubic-bezier(.16,1,.3,1) ${index * 0.05}s, transform 0.6s cubic-bezier(.16,1,.3,1) ${index * 0.05}s`;
            observer.observe(card);
        });
    }, 100);
});

// Smooth scroll for activity section
document.addEventListener('DOMContentLoaded', () => {
    const viewAllLink = document.querySelector('.activity-view-all');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            const activityList = document.querySelector('.activity-list');
            if (activityList) {
                activityList.scrollTop = activityList.scrollHeight;
            }
        });
    }
});

// Add loading animation for primary buttons
document.addEventListener('DOMContentLoaded', () => {
    const primaryBtns = document.querySelectorAll('.btn-primary');

    primaryBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.href && !this.href.includes('#')) {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                this.style.pointerEvents = 'none';

                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.pointerEvents = 'auto';
                }, 1500);
            }
        });
    });
});

// Chart hover effect with cursor tracking
document.addEventListener('DOMContentLoaded', () => {
    const heroChart = document.querySelector('.hero-chart');
    if (!heroChart) return;

    const chartWrapper = heroChart.closest('.hero-right');
    if (!chartWrapper) return;

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(5,5,5,0.9);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.75rem;
        color: #fff;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        backdrop-filter: blur(20px);
        z-index: 10;
    `;
    chartWrapper.style.position = 'relative';
    chartWrapper.appendChild(tooltip);

    // Sample data for tooltip
    const dataPoints = [
        { x: 0, y: 100, value: 98000, date: 'Jan' },
        { x: 60, y: 70, value: 105000, date: 'Feb' },
        { x: 180, y: 60, value: 115000, date: 'Mar' },
        { x: 360, y: 40, value: 127450, date: 'Apr' }
    ];

    chartWrapper.addEventListener('mousemove', (e) => {
        const rect = heroChart.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const scaleX = rect.width / 420;
        const scaleY = rect.height / 130;

        // Find closest data point
        let closest = null;
        let minDist = Infinity;

        dataPoints.forEach(point => {
            const px = point.x * scaleX;
            const py = point.y * scaleY;
            const dist = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));

            if (dist < minDist && dist < 50) {
                minDist = dist;
                closest = point;
            }
        });

        if (closest) {
            tooltip.innerHTML = `<strong>$${closest.value.toLocaleString()}</strong><br><small style="color: rgba(255,255,255,0.6)">${closest.date} 2025</small>`;
            tooltip.style.opacity = '1';
            tooltip.style.left = `${e.clientX - rect.left + 15}px`;
            tooltip.style.top = `${e.clientY - rect.top - 10}px`;
        } else {
            tooltip.style.opacity = '0';
        }
    });

    chartWrapper.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });
});

// Usage ring animation
document.addEventListener('DOMContentLoaded', () => {
    const ringSegments = document.querySelectorAll('.ring-segment');
    if (ringSegments.length > 0) {
        setTimeout(() => {
            ringSegments.forEach((segment, index) => {
                segment.style.transition = 'stroke-dasharray 1s cubic-bezier(.16,1,.3,1)';
            });
        }, 1000);
    }
});

// Keyboard shortcut for search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }
});

// Window blur/focus subtitle update
document.addEventListener('DOMContentLoaded', () => {
    const pageSubtitle = document.querySelector('.page-subtitle');

    window.addEventListener('blur', () => {
        if (pageSubtitle && pageSubtitle.querySelector('.text-white')) {
            // Could add a subtle "away" indicator
        }
    });

    window.addEventListener('focus', () => {
        if (pageSubtitle && pageSubtitle.querySelector('.text-white')) {
            // Reset when user returns
        }
    });
});
