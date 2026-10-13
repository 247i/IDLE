const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const inputs = {
        minute: document.getElementById('cronMinute'),
        hour: document.getElementById('cronHour'),
        day: document.getElementById('cronDay'),
        month: document.getElementById('cronMonth'),
        weekday: document.getElementById('cronWeekday')
    };
    
    const resultDisplay = document.getElementById('resultDisplay');
    const humanReadable = document.getElementById('humanReadable');
    const copyBtn = document.getElementById('copyBtn');
    const presetChips = document.querySelectorAll('.preset-chip');

    // Load state
    const state = vscode.getState() || {
        cron: '* * * * *'
    };

    updateInputsFromCron(state.cron);
    updateDisplay();

    function updateDisplay() {
        const cron = `${inputs.minute.value} ${inputs.hour.value} ${inputs.day.value} ${inputs.month.value} ${inputs.weekday.value}`;
        resultDisplay.textContent = cron;
        humanReadable.textContent = describeCron(cron);
        saveState();
    }

    function updateInputsFromCron(cron) {
        const parts = cron.split(' ');
        if (parts.length >= 5) {
            inputs.minute.value = parts[0];
            inputs.hour.value = parts[1];
            inputs.day.value = parts[2];
            inputs.month.value = parts[3];
            inputs.weekday.value = parts[4];
        }
    }

    function saveState() {
        vscode.setState({
            cron: resultDisplay.textContent
        });
    }

    // Event listeners for inputs
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updateDisplay);
    });

    // Presets
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cron = chip.dataset.cron;
            updateInputsFromCron(cron);
            updateDisplay();
        });
    });

    // Copy button
    copyBtn.addEventListener('click', () => {
        const text = resultDisplay.textContent;
        navigator.clipboard.writeText(text);
        vscode.postMessage({ command: 'track', action: 'copy' });
        
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
        }, 2000);
    });

    // Simple description function (very basic)
    function describeCron(cron) {
        try {
            const parts = cron.split(' ');
            if (parts.length < 5) {
                return 'Invalid cron expression';
            }

            const [min, hour, day, month, weekday] = parts;

            if (cron === '* * * * *') {
                return 'Every minute';
            }
            if (min === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
                return 'Every hour';
            }
            if (min === '0' && hour === '0' && day === '*' && month === '*' && weekday === '*') {
                return 'Every day at midnight';
            }
            if (min === '0' && hour === '0' && day === '*' && month === '*' && weekday === '0') {
                return 'Every Sunday at midnight';
            }
            if (min === '0' && hour === '0' && day === '1' && month === '*' && weekday === '*') {
                return 'First day of every month at midnight';
            }
            if (min === '0' && hour === '0' && day === '1' && month === '1' && weekday === '*') {
                return 'First day of every year at midnight';
            }

            // Basic parsing for other cases
            let desc = 'At ';
            
            if (min === '*' && hour === '*') {
                desc = 'Every minute';
            } else if (hour === '*') {
                desc = `Every hour at minute ${min}`;
            } else {
                desc = `${hour}:${min.padStart(2, '0')}`;
            }

            if (day !== '*') {
                desc += ` on day ${day} of the month`;
            }
            if (weekday !== '*') {
                desc += ` on ${getWeekdayName(weekday)}`;
            }
            if (month !== '*') {
                desc += ` in ${getMonthName(month)}`;
            }

            return desc;
        } catch (e) {
            return 'Invalid cron expression';
        }
    }

    function getWeekdayName(val) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        if (!isNaN(val)) {
            return days[parseInt(val)];
        }
        return val;
    }

    function getMonthName(val) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (!isNaN(val)) {
            return months[parseInt(val) - 1];
        }
        return val;
    }
});
