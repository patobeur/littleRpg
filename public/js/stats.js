// Stats page - SuperAdmin only
(async function () {
    // Protect page - SuperAdmin only
    await protectPage();

    // Check if user is SuperAdmin
    try {
        const sessionData = await API.auth.checkSession();
        if (!sessionData.user || sessionData.user.role !== 'superAdmin') {
            alert('Access denied. SuperAdmin only.');
            redirectTo('/dashboard.html');
            return;
        }
    } catch (error) {
        console.error('Failed to check permissions:', error);
        redirectTo('/dashboard.html');
        return;
    }

    // Load statistics
    async function loadStats() {
        try {
            const response = await fetch('/api/stats/visits', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const stats = await response.json();

            // Animate counters
            animateCounter('totalVisitors', stats.totalUnique);
            animateCounter('todayVisitors', stats.today);
            animateCounter('weekVisitors', stats.thisWeek);
            animateCounter('monthVisitors', stats.thisMonth);
            animateCounter('totalPageViews', stats.totalPageViews);

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Load recent visitors
    async function loadRecentVisitors() {
        const loadingEl = document.getElementById('visitors-loading');
        const errorEl = document.getElementById('visitors-error');
        const tableEl = document.getElementById('visitors-table');
        const tbodyEl = document.getElementById('visitors-tbody');

        try {
            loadingEl.classList.remove('hidden');
            errorEl.classList.add('hidden');
            tableEl.classList.add('hidden');

            const response = await fetch('/api/stats/recent-visitors?limit=50', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch visitors');
            }

            const visitors = await response.json();

            // Clear table
            tbodyEl.innerHTML = '';

            // Populate table
            if (visitors.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Aucun visiteur enregistré</td></tr>';
            } else {
                visitors.forEach(visitor => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><code>${visitor.visitor_id.substring(0, 12)}...</code></td>
                        <td>${visitor.ip_address || 'N/A'}</td>
                        <td class="user-agent-cell" title="${visitor.user_agent || 'N/A'}">
                            ${truncateUserAgent(visitor.user_agent || 'N/A')}
                        </td>
                        <td>${formatDate(visitor.first_visit)}</td>
                        <td>${formatDate(visitor.last_visit)}</td>
                        <td><span class="badge badge-primary">${visitor.visit_count}</span></td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }

            loadingEl.classList.add('hidden');
            tableEl.classList.remove('hidden');

        } catch (error) {
            console.error('Error loading visitors:', error);
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
            document.getElementById('error-message').textContent = error.message;
        }
    }

    // Animate counter
    function animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const startValue = 0;
        const duration = 1500;
        const startTime = Date.now();

        const updateCounter = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = progress * (2 - progress);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuad);

            element.textContent = currentValue.toLocaleString('fr-FR');

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = targetValue.toLocaleString('fr-FR');
            }
        };

        requestAnimationFrame(updateCounter);
    }

    // Truncate user agent for display
    function truncateUserAgent(ua) {
        if (ua.length > 60) {
            return ua.substring(0, 60) + '...';
        }
        return ua;
    }

    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Load security logs
    async function loadSecurityLogs() {
        const loadingEl = document.getElementById('security-loading');
        const errorEl = document.getElementById('security-error');
        const tableEl = document.getElementById('security-table');
        const tbodyEl = document.getElementById('security-tbody');

        try {
            loadingEl.classList.remove('hidden');
            errorEl.classList.add('hidden');
            tableEl.classList.add('hidden');

            const response = await fetch('/api/stats/security-logs?limit=20', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch security logs');

            const logs = await response.json();

            // Clear table
            tbodyEl.innerHTML = '';

            // Populate table
            if (logs.length === 0) {
                tbodyEl.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucu incident de sécurité récent</td></tr>';
            } else {
                logs.forEach(log => {
                    const row = document.createElement('tr');
                    // Extract event type from page path based on our convention "/AUTH/..."
                    const eventType = log.page.replace('/AUTH/', '');

                    row.innerHTML = `
                        <td>${formatDate(log.timestamp)}</td>
                        <td><span class="badge badge-danger">${eventType}</span></td>
                        <td>${log.referrer || 'N/A'}</td> <!-- Referrer stores the details message -->
                        <td><code>${log.ip_address}</code></td>
                        <td class="user-agent-cell" title="${log.user_agent}">
                            ${truncateUserAgent(log.user_agent)}
                        </td>
                    `;
                    tbodyEl.appendChild(row);
                });
            }

            loadingEl.classList.add('hidden');
            tableEl.classList.remove('hidden');

        } catch (error) {
            console.error('Error loading security logs:', error);
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
        }
    }

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await Promise.all([loadStats(), loadRecentVisitors(), loadSecurityLogs()]);
    });

    // Export & Reset button
    document.getElementById('exportResetBtn').addEventListener('click', async () => {
        const confirmed = confirm(
            '⚠️ ATTENTION ⚠️\n\n' +
            'Cette action va :\n' +
            '1. Télécharger toutes les données actuelles (JSON)\n' +
            '2. SUPPRIMER toutes les statistiques de la base de données\n\n' +
            'Les données téléchargées seront sauvegardées localement.\n\n' +
            'Voulez-vous continuer ?'
        );

        if (!confirmed) {
            console.log('Export & Reset cancelled by user');
            return;
        }

        console.log('Starting export & reset process...');

        try {
            // Export data first
            console.log('Fetching data from /api/stats/export...');
            const exportResponse = await fetch('/api/stats/export', {
                credentials: 'include'
            });

            console.log('Export response status:', exportResponse.status);

            if (!exportResponse.ok) {
                const errorText = await exportResponse.text();
                console.error('Export failed:', errorText);
                throw new Error(`Failed to export data: ${exportResponse.status} ${errorText}`);
            }

            const exportData = await exportResponse.json();
            console.log('Export data received:', exportData);

            // Download as JSON file
            console.log('Creating download...');
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.download = `littlerpg-stats-${timestamp}.json`;

            console.log('Download filename:', a.download);
            console.log('Blob size:', blob.size, 'bytes');

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('Download triggered');

            // Wait a bit for download to start
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Reset stats
            console.log('Resetting stats...');
            const resetResponse = await fetch('/api/stats/reset', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Reset response status:', resetResponse.status);

            if (!resetResponse.ok) {
                const errorText = await resetResponse.text();
                console.error('Reset failed:', errorText);
                throw new Error(`Failed to reset stats: ${resetResponse.status}`);
            }

            const resetResult = await resetResponse.json();
            console.log('Reset result:', resetResult);

            alert('✅ Export et reset effectués avec succès!\n\nLe fichier a été téléchargé et les statistiques ont été réinitialisées.');

            // Reload page
            console.log('Reloading stats...');
            await Promise.all([loadStats(), loadRecentVisitors()]);

        } catch (error) {
            console.error('Error during export & reset:', error);
            alert('❌ Erreur : ' + error.message + '\n\nConsultez la console (F12) pour plus de détails.');
        }
    });

    // Initial load
    await Promise.all([loadStats(), loadRecentVisitors(), loadSecurityLogs()]);

    // Auto-refresh every 30 seconds
    setInterval(async () => {
        await Promise.all([loadStats(), loadRecentVisitors(), loadSecurityLogs()]);
    }, 30000);
})();
