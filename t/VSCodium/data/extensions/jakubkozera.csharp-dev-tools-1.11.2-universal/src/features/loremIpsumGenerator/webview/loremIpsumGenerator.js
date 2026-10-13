const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const outputContainer = document.getElementById('outputContainer');
    
    const countInput = document.getElementById('countInput');
    const typeSelect = document.getElementById('typeSelect');
    const startWithLoremCheckbox = document.getElementById('startWithLoremCheckbox');

    // Standard Lorem Ipsum text
    const loremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    
    const words = loremIpsum.replace(/[.,]/g, '').toLowerCase().split(' ');
    // Add some more variety
    const moreWords = "sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt neque porro quisquam est qui dolorem ipsum quia dolor sit amet consectetur adipisci velit sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem ut enim ad minima veniam quis nostrum exercitationem ullam corporis suscipit laboriosam nisi ut aliquid ex ea commodi consequatur quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur vel illum qui dolorem eum fugiat quo voluptas nulla pariatur".split(' ');
    const allWords = [...new Set([...words, ...moreWords])];

    // Load state
    const state = vscode.getState() || {
        count: 5,
        type: 'paragraphs',
        startWithLorem: true
    };

    countInput.value = state.count;
    typeSelect.value = state.type;
    startWithLoremCheckbox.checked = state.startWithLorem;

    function generateText() {
        const count = parseInt(countInput.value) || 1;
        const type = typeSelect.value;
        const startWithLorem = startWithLoremCheckbox.checked;
        
        let result = '';

        if (type === 'paragraphs') {
            result = generateParagraphs(count, startWithLorem);
        } else if (type === 'sentences') {
            result = generateSentences(count, startWithLorem);
        } else if (type === 'words') {
            result = generateWords(count, startWithLorem);
        }

        outputContainer.textContent = result;
        
        vscode.postMessage({ command: 'track', action: 'generate' });
        saveState();
    }

    function generateParagraphs(count, startWithLorem) {
        const paragraphs = [];
        for (let i = 0; i < count; i++) {
            const sentenceCount = Math.floor(Math.random() * 5) + 3; // 3-7 sentences per paragraph
            let paragraph = generateSentences(sentenceCount, i === 0 && startWithLorem);
            paragraphs.push(paragraph);
        }
        return paragraphs.join('\n\n');
    }

    function generateSentences(count, startWithLorem) {
        const sentences = [];
        for (let i = 0; i < count; i++) {
            if (i === 0 && startWithLorem) {
                sentences.push(loremIpsum.split('.')[0] + '.');
            } else {
                const wordCount = Math.floor(Math.random() * 10) + 5; // 5-14 words per sentence
                let sentence = generateWords(wordCount, false);
                sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
                sentences.push(sentence);
            }
        }
        return sentences.join(' ');
    }

    function generateWords(count, startWithLorem) {
        if (startWithLorem) {
            const loremWords = loremIpsum.replace(/[.,]/g, '').toLowerCase().split(' ');
            if (count <= loremWords.length) {
                return loremWords.slice(0, count).join(' ');
            }
            return loremWords.join(' ') + ' ' + generateWords(count - loremWords.length, false);
        }

        const result = [];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * allWords.length);
            result.push(allWords[randomIndex]);
        }
        return result.join(' ');
    }

    function saveState() {
        vscode.setState({
            count: parseInt(countInput.value),
            type: typeSelect.value,
            startWithLorem: startWithLoremCheckbox.checked
        });
    }

    generateBtn.addEventListener('click', generateText);
    
    copyBtn.addEventListener('click', () => {
        const text = outputContainer.textContent;
        if (text) {
            navigator.clipboard.writeText(text);
            vscode.postMessage({ command: 'track', action: 'copy' });
            
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
            }, 2000);
        }
    });

    clearBtn.addEventListener('click', () => {
        outputContainer.textContent = '';
        vscode.postMessage({ command: 'track', action: 'clear' });
    });

    // Generate on load
    generateText();
});
