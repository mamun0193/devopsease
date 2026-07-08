const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../server/src/models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.js'));

for (const file of files) {
    const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
    const lines = content.split('\n');
    let inField = false;
    let fieldName = '';
    let hasRef = false;
    let hasIndex = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Very basic heuristic
        const fieldMatch = line.match(/^\s+([a-zA-Z0-9_]+):\s*\{/);
        if (fieldMatch) {
            inField = true;
            fieldName = fieldMatch[1];
            hasRef = false;
            hasIndex = false;
            continue;
        }

        if (inField) {
            if (line.includes('ref:')) hasRef = true;
            if (line.includes('index:')) hasIndex = true;

            if (line.match(/^\s+\}/) || line.match(/^\s+\},/)) {
                if (hasRef && !hasIndex) {
                    // Check if it's in a compound index at the bottom
                    const compoundRegex = new RegExp(`\\.index\\(\\{.*${fieldName}.*\\}\\)`);
                    if (!compoundRegex.test(content)) {
                        console.log(`[${file}] Missing index for ref field: ${fieldName}`);
                    }
                }
                inField = false;
            }
        }
    }
}
