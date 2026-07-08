const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../server/src/models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.model.js'));

for (const file of files) {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;
    
    let inField = false;
    let fieldStartLine = -1;
    let fieldName = '';
    let hasRef = false;
    let hasIndex = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        const fieldMatch = line.match(/^(\s+)([a-zA-Z0-9_]+):\s*\{/);
        if (fieldMatch) {
            inField = true;
            fieldStartLine = i;
            fieldName = fieldMatch[2];
            hasRef = false;
            hasIndex = false;
            continue;
        }

        if (inField) {
            if (line.includes('ref:')) hasRef = true;
            if (line.includes('index:')) hasIndex = true;

            if (line.match(/^\s+\}/) || line.match(/^\s+\},/)) {
                if (hasRef && !hasIndex) {
                    const compoundRegex = new RegExp(`\\.index\\(\\{.*${fieldName}.*\\}\\)`);
                    if (!compoundRegex.test(content)) {
                        // Needs index!
                        // insert index: true before the closing brace
                        const indentMatch = lines[fieldStartLine].match(/^(\s+)/);
                        const baseIndent = indentMatch ? indentMatch[1] : '  ';
                        
                        // We will insert `index: true,` right before this closing brace line
                        lines.splice(i, 0, `${baseIndent}  index: true,`);
                        modified = true;
                        i++; // adjust for the inserted line
                    }
                }
                inField = false;
            }
        }
    }
    
    if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`Updated ${file} with missing indexes.`);
    }
}
